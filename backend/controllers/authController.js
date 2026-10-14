const database = require('../config/database');
const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { name, email, phone, address, password } = req.body;
  if (!name || !email || !phone || !address || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  let connection;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    connection = await database.getConnection();
    
    const result = await connection.execute(
      `BEGIN PKG_AUTH.REGISTER_CUSTOMER(:p_name, :p_email, :p_phone, :p_address, :p_password, :p_account_id, :p_customer_id); END;`,
      {
        p_name: name,
        p_email: email,
        p_phone: phone,
        p_address: address,
        p_password: hashedPassword,
        p_account_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        p_customer_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    
    // Commit since autoCommit is false and PL/SQL might not commit
    await connection.commit();

    const accountId = result.outBinds.p_account_id;
    const customerId = result.outBinds.p_customer_id;

    const token = jwt.sign(
      { accountId, email, role: 'CUSTOMER', customerId, name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ success: true, token, user: { accountId, customerId, email, role: 'CUSTOMER', name } });
  } catch (err) {
    console.error('Error:', err);
    let message = err.message || 'Registration failed';
    if (message.includes('ORA-20001') || message.includes('Email already exists') || err.errorNum === 20001 || message.includes('ORA-00001') || message.includes('UQ_CUSTOMER_EMAIL') || message.includes('unique constraint')) {
      message = 'Email already exists. Please login or use a different email.';
    }
    const statusCode = (err.errorNum === 20001 || message.includes('Email already exists')) ? 400 : 500;
    res.status(statusCode).json({ success: false, message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  let connection;
  try {
    connection = await database.getConnection();
    
    const result = await connection.execute(
      `BEGIN :cursor := PKG_AUTH.AUTHENTICATE_USER(:p_email, :p_password); END;`,
      {
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_email: email,
        p_password: email // Dummy, check happens in app
      }
    );
    
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1);
    await resultSet.close();

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    
    const isMatch = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Call SP_UPDATE_LAST_LOGIN if it exists, assume it does
    try {
        await connection.execute(`BEGIN SP_UPDATE_LAST_LOGIN(:p_account_id); END;`, { p_account_id: user.ACCOUNT_ID });
        await connection.commit();
    } catch(e) {
        console.error('Failed to update last login', e);
    }

    const payload = {
        accountId: user.ACCOUNT_ID,
        email: user.EMAIL,
        role: user.ROLE,
        name: user.NAME,
        customerId: user.CUSTOMER_ID || null,
        employeeId: user.EMPLOYEE_ID || null
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ success: true, token, user: payload });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Login failed due to server error' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Old and new passwords required' });
  }

  let connection;
  try {
    connection = await database.getConnection();
    
    // Get user hash
    const result = await connection.execute(
      `BEGIN :cursor := PKG_AUTH.AUTHENTICATE_USER(:p_email, :p_password); END;`,
      {
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        p_email: req.user.email,
        p_password: req.user.email
      }
    );
    
    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(1);
    await resultSet.close();

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(oldPassword, user.PASSWORD_HASH);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect old password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await connection.execute(
      `BEGIN PKG_AUTH.CHANGE_PASSWORD(:p_account_id, :p_old_password, :p_new_password); END;`,
      {
        p_account_id: req.user.accountId,
        p_old_password: user.PASSWORD_HASH,
        p_new_password: hashedNewPassword
      }
    );
    
    await connection.commit();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error:', err);
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};

exports.deleteAccount = async (req, res) => {
  let connection;
  try {
    connection = await database.getConnection();
    
    await connection.execute(
      `BEGIN PKG_AUTH.DELETE_ACCOUNT(:p_account_id); END;`,
      {
        p_account_id: req.user.accountId
      }
    );
    await connection.commit();
    
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Error:', err);
    const statusCode = err.errorNum === 20001 ? 400 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
};
