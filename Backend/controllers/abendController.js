const { getPool, sql } = require('../config/database');

// Helper function to build dynamic WHERE clause from frontend filters
const buildWhereClause = (filters) => {
  const conditions = [];
  const parameters = {};

  const addCondition = (field, operator, value, type, format = (v) => v) => {
    // Check for non-empty strings and non-null values
    if (value !== undefined && value !== null && value !== '') {
      const paramName = field.replace('.', '_');
      conditions.push(`${field} ${operator} @${paramName}`);
      parameters[paramName] = { value: format(value), type };
    }
  };
  
  addCondition('log_number', '=', filters.log_number, sql.Int);
  addCondition('subsystem', 'LIKE', filters.subsystem, sql.VarChar, v => `%${v}%`);
  addCondition('composite', 'LIKE', filters.composite, sql.VarChar, v => `%${v}%`);
  addCondition('program', 'LIKE', filters.program, sql.VarChar, v => `%${v}%`);
  addCondition('abend_code', 'LIKE', filters.abend_code, sql.VarChar, v => `%${v}%`);
  addCondition('job_name', 'LIKE', filters.job_name, sql.VarChar, v => `%${v}%`);
  addCondition('se_name', 'LIKE', filters.se_name, sql.VarChar, v => `%${v}%`);
  addCondition('entered_by', 'LIKE', filters.entered_by, sql.VarChar, v => `%${v}%`);
  
  // Use the actual DB column names `abend_year` and `abend_mmdd`
  addCondition('abend_year', '=', filters.year, sql.Char(4));
  if (filters.mmdd) {
    const mmdd = String(filters.mmdd);
    if (mmdd.length === 4) {
      addCondition('abend_mmdd', '=', mmdd, sql.Char(4));
    } else {
      addCondition('abend_mmdd', 'LIKE', mmdd, sql.VarChar, v => `${v.padStart(2,'0')}%`);
    }
  }
  
  return {
    whereClause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    parameters
  };
};

// Map DB record (with abend_year, abend_mmdd) to frontend AbendLog (with abend_date)
const mapLog = (dbRecord) => {
    if (!dbRecord) return null;
    const { abend_year, abend_mmdd, ...rest } = dbRecord;

    // Combine YYYY and MMDD into YYYY-MM-DD format
    const abend_date = (abend_year && abend_mmdd && abend_mmdd.length === 4) 
        ? `${abend_year}-${abend_mmdd.substring(0, 2)}-${abend_mmdd.substring(2, 4)}` 
        : null;

    // TIME columns from mssql can be Date objects, format them to HH:mm:ss string
    const formatTime = (time) => (time instanceof Date ? time.toTimeString().split(' ')[0] : time);
    // DATE columns from mssql can be Date objects, format them to YYYY-MM-DD string
    const formatDate = (date) => (date instanceof Date ? date.toISOString().split('T')[0] : date);

    return {
        ...rest,
        abend_date,
        entered_date: formatDate(dbRecord.entered_date),
        entered_time: formatTime(dbRecord.entered_time),
        updated_date: formatDate(dbRecord.updated_date),
        updated_time: formatTime(dbRecord.updated_time),
    };
};

// Get abend logs with filters
const getAbendLogs = async (req, res, next) => {
  try {
    const pool = getPool();
    const { whereClause, parameters } = buildWhereClause(req.query);

    if (whereClause === '') {
      return res.json({ logs: [], totalCount: 0 });
    }
    
    // First, get the total count
    const countRequest = pool.request();
    Object.keys(parameters).forEach(key => {
        countRequest.input(key, parameters[key].type, parameters[key].value);
    });
    
    const countResult = await countRequest.query(`
        SELECT COUNT(*) as totalCount FROM master_table
        ${whereClause}
    `);
    const totalCount = countResult.recordset[0].totalCount;
    
    if (totalCount === 0) {
        return res.json({ logs: [], totalCount: 0 });
    }

    // Handle pagination
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const offset = (page - 1) * pageSize;

    // Then, get the paginated data
    const dataRequest = pool.request();
    Object.keys(parameters).forEach(key => {
        dataRequest.input(key, parameters[key].type, parameters[key].value);
    });
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('pageSize', sql.Int, pageSize);

    const result = await dataRequest.query(`
      SELECT * FROM master_table
      ${whereClause}
      ORDER BY abend_year DESC, log_number DESC
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY
    `);
    
    res.json({
        logs: result.recordset.map(mapLog),
        totalCount: totalCount
    });
    
  } catch (error) {
    next(error);
  }
};

// Get single abend log by Year and Number
const getAbendLogByYearAndNumber = async (req, res, next) => {
  try {
    const { year, log_number } = req.params;
    const pool = getPool();
    
    const result = await pool.request()
      .input('year', sql.Char(4), year)
      .input('log_number', sql.Int, log_number)
      .query('SELECT * FROM master_table WHERE abend_year = @year AND log_number = @log_number');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Abend log not found' });
    }
    
    res.json(mapLog(result.recordset[0]));
    
  } catch (error) {
    next(error);
  }
};

// Get next log number for a given year
const getNextLogNumber = async (req, res, next) => {
    try {
        const { year } = req.query;
        if (!year || !/^\d{4}$/.test(year)) {
            return res.status(400).json({ success: false, message: 'A valid 4-digit year must be provided.' });
        }
        
        const pool = getPool();
        const result = await pool.request()
            .input('year', sql.Char(4), year)
            .query('SELECT ISNULL(MAX(log_number), 0) + 1 AS nextLogNumber FROM master_table WHERE abend_year = @year');

        res.json(result.recordset[0].nextLogNumber);
    } catch(error) {
        next(error);
    }
};

// Create new abend log entry
const createAbendLog = async (req, res, next) => {
  const transaction = new sql.Transaction(getPool());
  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    const { abend_date, abend_year, abend_mmdd } = req.body;
    let effectiveYear, effectiveMmdd;

    if (abend_date && /^\d{4}-\d{2}-\d{2}$/.test(abend_date)) {
        const [year, month, day] = abend_date.split('-');
        effectiveYear = year;
        effectiveMmdd = month + day;
    } else if (abend_year && abend_mmdd && /^\d{4}$/.test(abend_year) && /^\d{4}$/.test(abend_mmdd)) {
        effectiveYear = abend_year;
        effectiveMmdd = abend_mmdd;
    } else {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Invalid or missing date. Provide abend_date (YYYY-MM-DD) or both abend_year (YYYY) and abend_mmdd (MMDD).' });
    }
    
    const logNumResult = await request
        .input('year', sql.Char(4), effectiveYear)
        .query('SELECT ISNULL(MAX(log_number), 0) + 1 AS nextLogNumber FROM master_table WITH (UPDLOCK, HOLDLOCK) WHERE abend_year = @year');
    const newLogNumber = logNumResult.recordset[0].nextLogNumber;

    const columns = ['log_number', 'entered_by', 'entered_time', 'entered_date', 'abend_year', 'abend_mmdd'];
    const values = ['@log_number', '@entered_by', 'CAST(GETDATE() AS TIME)', 'CAST(GETDATE() AS DATE)', '@abend_year', '@abend_mmdd'];

    request.input('log_number', sql.Int, newLogNumber);
    request.input('entered_by', sql.VarChar, req.user.userId); // Use authenticated user
    request.input('abend_year', sql.Char(4), effectiveYear);
    request.input('abend_mmdd', sql.Char(4), effectiveMmdd);

    const readOnlyFields = ['log_id', 'log_number', 'abend_date', 'abend_year', 'abend_mmdd', 'entered_by', 'entered_time', 'entered_date', 'updated_by', 'updated_time', 'updated_date'];

    Object.keys(req.body).forEach(key => {
        if (!readOnlyFields.includes(key)) {
            const value = req.body[key];
            if (value !== undefined && value !== null) {
                columns.push(key);
                values.push(`@${key}`);
                let type = sql.VarChar;
                if (typeof value === 'number') type = sql.Int;
                request.input(key, type, value);
            }
        }
    });

    const result = await request.query(`
      INSERT INTO master_table (${columns.join(', ')}) 
      OUTPUT INSERTED.*
      VALUES (${values.join(', ')});
    `);
    
    await transaction.commit();
    res.status(201).json(mapLog(result.recordset[0]));

  } catch (error) {
    if (transaction.active) {
      await transaction.rollback();
    }
    next(error);
  }
};


// Update abend log entry
const updateAbendLog = async (req, res, next) => {
  try {
    const { year, log_number } = req.params;
    const pool = getPool();
    const request = pool.request()
      .input('year_param', sql.Char(4), year)
      .input('log_number_param', sql.Int, log_number)
      .input('updated_by', sql.VarChar, req.user.userId); // Use authenticated user


    const setClauses = [];

    if (req.body.abend_date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.abend_date)) {
            return res.status(400).json({ success: false, message: 'Invalid abend_date format. Expected YYYY-MM-DD.' });
        }
        const [newYear, newMonth, newDay] = req.body.abend_date.split('-');
        setClauses.push('abend_year = @abend_year', 'abend_mmdd = @abend_mmdd');
        request.input('abend_year', sql.Char(4), newYear);
        request.input('abend_mmdd', sql.Char(4), newMonth + newDay);
    }
    
    const readOnlyFields = ['log_id', 'log_number', 'abend_date', 'entered_by', 'entered_date', 'entered_time', 'updated_by', 'updated_date', 'updated_time'];
    
    Object.keys(req.body).forEach(key => {
        if (!readOnlyFields.includes(key)) {
            setClauses.push(`${key} = @${key}`);
            const value = req.body[key];
            let type = sql.VarChar;
            if (typeof value === 'number') type = sql.Int;
            request.input(key, type, value);
        }
    });
    
    if(setClauses.length === 0) {
        return res.status(400).json({ success: false, message: "No fields to update provided." });
    }

    const result = await request.query(`
      UPDATE master_table SET ${setClauses.join(', ')}, updated_by = @updated_by, updated_time = CAST(GETDATE() AS TIME), updated_date = CAST(GETDATE() AS DATE)
      OUTPUT INSERTED.*
      WHERE abend_year = @year_param AND log_number = @log_number_param
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Abend log not found' });
    }

    res.json(mapLog(result.recordset[0]));

  } catch (error) {
    next(error);
  }
};


// Delete abend log entry
const deleteAbendLog = async (req, res, next) => {
  try {
    const { year, log_number } = req.params;
    const pool = getPool();
    
    const result = await pool.request()
      .input('year', sql.Char(4), year)
      .input('log_number', sql.Int, log_number)
      .query('DELETE FROM master_table WHERE abend_year = @year AND log_number = @log_number');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Abend log not found' });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAbendLogs,
  getAbendLogByYearAndNumber,
  getNextLogNumber,
  createAbendLog,
  updateAbendLog,
  deleteAbendLog
};