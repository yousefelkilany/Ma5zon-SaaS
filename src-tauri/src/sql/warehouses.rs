//! SQL statements for warehouses entity.

use rusqlite::{Connection, Result as DbErr};

#[derive(Debug, Clone)]
pub struct Warehouse {
    pub id: i64,
    pub name: String,
    pub location: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

impl Warehouse {
    pub fn from_row(row:&rusqlite::Row) -> DbErr<Self> {
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

pub fn fetch_all(
    conn: &Connection,
    limit: Option<i64>,
    offset: Option<i64>,
) -> DbErr<(Vec<Warehouse>, i64)> {
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM warehouses",
        [],
        |row| row.get(0),
    )?;

    let warehouses = match (limit, offset) {
        (Some(limit), Some(offset)) => {
            let mut stmt = conn.prepare(
                "SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses LIMIT ? OFFSET ?"
            )?;
            let rows = stmt.query_map([limit, offset], Warehouse::from_row)?;
            rows.collect()
        }
        (Some(limit), None) => {
            let mut stmt = conn.prepare(
                "SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses LIMIT ?"
            )?;
            let rows = stmt.query_map([limit], Warehouse::from_row)?;
            rows.collect()
        }
        _ => {
            let mut stmt = conn.prepare(
                "SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses"
            )?;
            let rows = stmt.query_map([], Warehouse::from_row)?;
            rows.collect()
        }
    }?;

    Ok((warehouses, total))
}

pub async fn fetch_all(
    db: &Pool<Sqlite>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<(Vec<Warehouse>, i64), DbErr> {
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM warehouses")
        .fetch_one(db)
        .await?;

    let warehouses = match (limit, offset) {
        (Some(limit), Some(offset)) => {
            sqlx::query_as::<_, Warehouse>(
                "SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses LIMIT ? OFFSET ?"
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(db)
        }
        (Some(limit), None) => {
            sqlx::query_as::<_, Warehouse>(
                "SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses LIMIT ?"
            )
            .bind(limit)
            .fetch_all(db)
        }
        _ => {
            sqlx::query_as::<_, Warehouse>(
                "SELECT id, name, location, created_at, updated_at, deleted_at FROM warehouses"
            )
            .fetch_all(db)
        }
    }.await?;

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
    );

    CREATE VIEW IF NOT EXISTS active_warehouses AS
    SELECT * FROM warehouses WHERE deleted_at IS NULL;"
}

pub fn get_all() -> &'static str {
    "SELECT id, name, location, created_at, updated_at, deleted_at \
     FROM active_warehouses ORDER BY name"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, name, location, created_at, updated_at, deleted_at \
     FROM active_warehouses WHERE id = ?1"
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
                        let min = arr.get(0).and_then(|v| v.as_str()).unwrap_or("");
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

pub fn build_get_all(where_clause: &str, sort: Option<&SortState>) -> String {
    let base = "SELECT id, name, location, created_at, updated_at, deleted_at FROM active_warehouses";
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
