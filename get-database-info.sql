-- ===================================================================
-- Azure SQL Database Schema Information
-- Copy and run this in Azure SQL Query Editor
-- Then copy ALL results and paste them back
-- ===================================================================

-- Complete Database Schema Information
SELECT 
    t.TABLE_NAME AS [Table],
    c.COLUMN_NAME AS [Column],
    c.DATA_TYPE AS [DataType],
    CASE 
        WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN c.DATA_TYPE + '(' + CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR) + ')'
        ELSE c.DATA_TYPE
    END AS [FullDataType],
    c.IS_NULLABLE AS [Nullable],
    CASE 
        WHEN pk.COLUMN_NAME IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END AS [IsPrimaryKey],
    CASE 
        WHEN fk.COLUMN_NAME IS NOT NULL THEN 'YES - References ' + fk.REFERENCED_TABLE + '(' + fk.REFERENCED_COLUMN + ')'
        ELSE 'NO'
    END AS [IsForeignKey],
    CASE 
        WHEN c.DATA_TYPE IN ('int', 'bigint', 'smallint', 'tinyint') 
             AND COLUMNPROPERTY(OBJECT_ID(t.TABLE_SCHEMA + '.' + t.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') = 1 
        THEN 'YES'
        ELSE 'NO'
    END AS [IsIdentity],
    c.COLUMN_DEFAULT AS [DefaultValue]
FROM INFORMATION_SCHEMA.TABLES t
INNER JOIN INFORMATION_SCHEMA.COLUMNS c 
    ON t.TABLE_NAME = c.TABLE_NAME 
    AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
LEFT JOIN (
    SELECT ku.TABLE_NAME, ku.COLUMN_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
        ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
LEFT JOIN (
    SELECT 
        fk.name AS FK_NAME,
        tp.name AS TABLE_NAME,
        cp.name AS COLUMN_NAME,
        tr.name AS REFERENCED_TABLE,
        cr.name AS REFERENCED_COLUMN
    FROM sys.foreign_keys AS fk
    INNER JOIN sys.foreign_key_columns AS fkc 
        ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.tables AS tp 
        ON fkc.parent_object_id = tp.object_id
    INNER JOIN sys.columns AS cp 
        ON fkc.parent_object_id = cp.object_id 
        AND fkc.parent_column_id = cp.column_id
    INNER JOIN sys.tables AS tr 
        ON fkc.referenced_object_id = tr.object_id
    INNER JOIN sys.columns AS cr 
        ON fkc.referenced_object_id = cr.object_id 
        AND fkc.referenced_column_id = cr.column_id
) fk ON c.TABLE_NAME = fk.TABLE_NAME AND c.COLUMN_NAME = fk.COLUMN_NAME
WHERE t.TABLE_TYPE = 'BASE TABLE'
ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION;
