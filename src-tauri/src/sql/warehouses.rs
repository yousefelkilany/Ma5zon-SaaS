//! SQL statements for warehouses entity.

use rusqlite::{Connection, Result as DbErr};

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Warehouse {
    pub id: i64,
    pub name: String,
    pub location: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

impl Warehouse {
    #[allow(dead_code)]
    pub fn from_row(row: &rusqlite::Row) -> DbErr<Self> {
        Ok(Warehouse {
            id: row.get(0)?,
            name: row.get(1)?,
            location: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            deleted_at: row.get(5)?,
        })
    }
}

#[allow(dead_code)]
pub fn fetch_all(
    conn: &Connection,
    limit: Option<i32>,
    offset: Option<i32>,
) -> DbErr<(Vec<Warehouse>, i32)> {
    let total: i32 = conn.query_row("SELECT COUNT(*) FROM warehouses", [], |row| row.get(0))?;

    let warehouses: Vec<Warehouse> = match (limit, offset) {
        (Some(limit), Some(offset)) => {
            let mut stmt = conn.prepare(
                "SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses LIMIT ? OFFSET ?",
            )?;
            let mut rows = stmt.query([limit, offset])?;
            let mut warehouses = Vec::new();
            while let Some(row) = rows.next()? {
                warehouses.push(Warehouse::from_row(row)?);
            }
            warehouses
        }
        (Some(limit), None) => {
            let mut stmt = conn.prepare(
                "SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses LIMIT ?",
            )?;
            let mut rows = stmt.query([limit])?;
            let mut warehouses = Vec::new();
            while let Some(row) = rows.next()? {
                warehouses.push(Warehouse::from_row(row)?);
            }
            warehouses
        }
        _ => {
            let mut stmt = conn.prepare(
                "SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses",
            )?;
            let mut rows = stmt.query([])?;
            let mut warehouses = Vec::new();
            while let Some(row) = rows.next()? {
                warehouses.push(Warehouse::from_row(row)?);
            }
            warehouses
        }
    };

    Ok((warehouses, total))
}

pub fn create_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
    ) STRICT;

    CREATE VIEW IF NOT EXISTS active_warehouses AS
    SELECT * FROM warehouses WHERE deleted_at IS NULL;"
}

#[allow(dead_code)]
pub fn get_all() -> &'static str {
    "SELECT id, name, location, created_at, updated_at, deleted_at \
     FROM active_warehouses ORDER BY name"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, name, location, created_at, updated_at, deleted_at \
     FROM active_warehouses WHERE id = ?1"
}

pub fn get_by_ids(n: usize) -> String {
    let placeholders = std::iter::repeat("?")
        .take(n)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "SELECT id, name, location, created_at, updated_at, deleted_at \
         FROM active_warehouses WHERE id IN ({placeholders})"
    )
}

pub fn create() -> &'static str {
    "INSERT INTO warehouses (name, location, created_at, updated_at) \
     VALUES (?1, ?2, ?3, ?4)"
}

pub fn update() -> &'static str {
    "UPDATE warehouses SET name = ?1, location = ?2, updated_at = ?3 \
     WHERE id = ?4 AND deleted_at IS NULL"
}

pub fn soft_delete() -> &'static str {
    "UPDATE warehouses SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL"
}

pub fn get_created_at() -> &'static str {
    "SELECT created_at FROM active_warehouses WHERE id = ?1"
}

use crate::types::{FilterState, SortState};

pub fn build_where_clause(filters: &[FilterState]) -> String {
    if filters.is_empty() {
        return String::new();
    }

    let clauses: Vec<String> = filters
        .iter()
        .map(|f| {
            let column = &f.column_id;
            match f.operator.as_str() {
                "eq" => {
                    if let Some(arr) = f.value.as_array() {
                        let vals: Vec<String> = arr
                            .iter()
                            .filter_map(|v| v.as_str().map(|s| format!("'{}'", s)))
                            .collect();
                        format!("{} IN ({})", column, vals.join(", "))
                    } else {
                        let val = f.value.as_str().unwrap_or("");
                        format!("{} = '{}'", column, val)
                    }
                }
                "neq" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} != '{}'", column, val)
                }
                "contains" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} LIKE '%{}%'", column, val)
                }
                "gt" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} > '{}'", column, val)
                }
                "gte" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} >= '{}'", column, val)
                }
                "lt" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} < '{}'", column, val)
                }
                "lte" => {
                    let val = f.value.as_str().unwrap_or("");
                    format!("{} <= '{}'", column, val)
                }
                "between" => {
                    if let Some(arr) = f.value.as_array() {
                        let min = arr.first().and_then(|v| v.as_str()).unwrap_or("");
                        let max = arr.get(1).and_then(|v| v.as_str()).unwrap_or("");
                        format!("{} BETWEEN '{}' AND '{}'", column, min, max)
                    } else {
                        String::new()
                    }
                }
                _ => String::new(),
            }
        })
        .collect();

    if clauses.is_empty() {
        String::new()
    } else {
        format!("({})", clauses.join(" AND "))
    }
}

pub fn build_get_paginated(
    where_clause: &str,
    sort: Option<&SortState>,
    limit: i32,
    offset: i32,
) -> String {
    let base =
        "SELECT id, name, location, created_at, updated_at, deleted_at FROM active_warehouses";
    let query = if where_clause.is_empty() {
        base.to_string()
    } else {
        format!("{base} WHERE {where_clause}")
    };

    let ordered = match sort {
        Some(s) => format!("{query} ORDER BY {} {}", s.column_id, s.direction),
        None => format!("{query} ORDER BY name"),
    };

    format!("{ordered} LIMIT {limit} OFFSET {offset}")
}

pub fn count_query(where_clause: &str) -> String {
    if where_clause.is_empty() {
        "SELECT COUNT(*) FROM active_warehouses".to_string()
    } else {
        format!(
            "SELECT COUNT(*) FROM active_warehouses WHERE {}",
            where_clause
        )
    }
}

pub fn build_get_all(where_clause: &str, sort: Option<&SortState>) -> String {
    let base =
        "SELECT id, name, location, created_at, updated_at, deleted_at FROM active_warehouses";
    let query = if where_clause.is_empty() {
        base.to_string()
    } else {
        format!("{base} WHERE {where_clause}")
    };

    match sort {
        Some(s) => format!("{query} ORDER BY {} {}", s.column_id, s.direction),
        None => format!("{query} ORDER BY name"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_by_ids_builds_n_placeholders() {
        let sql = get_by_ids(0);
        assert_eq!(
            sql,
            "SELECT id, name, location, created_at, updated_at, deleted_at \
             FROM active_warehouses WHERE id IN ()"
        );

        let sql = get_by_ids(4);
        assert_eq!(
            sql,
            "SELECT id, name, location, created_at, updated_at, deleted_at \
             FROM active_warehouses WHERE id IN (?,?,?,?)"
        );
    }
}
