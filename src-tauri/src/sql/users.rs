//! SQL statements for users entity.

pub fn create_table() -> &'static str {
    "CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        avatar_url TEXT,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
    ) SRTICT;

    CREATE VIEW IF NOT EXISTS active_users AS
    SELECT * FROM users WHERE deleted_at IS NULL;"
}

pub fn get_by_name() -> &'static str {
    "SELECT id, name, email, role, avatar_url, password_hash \
     FROM active_users WHERE name = ?1"
}

pub fn get_by_id() -> &'static str {
    "SELECT id, name, email, role, avatar_url FROM active_users WHERE id = ?1"
}

pub fn get_by_ids(n: usize) -> String {
    let placeholders = std::iter::repeat("?")
        .take(n)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        "SELECT id, name, email, role, avatar_url FROM active_users WHERE id IN ({placeholders})"
    )
}

pub fn upsert() -> &'static str {
    "INSERT INTO users (id, name, role, avatar_url) VALUES (?1, ?2, ?3, ?4) \
     ON CONFLICT(id) DO UPDATE SET name = ?2, role = ?3, avatar_url = ?4"
}

pub fn soft_delete() -> &'static str {
    "UPDATE users SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL"
}

pub fn get_password_hash() -> &'static str {
    "SELECT password_hash FROM active_users WHERE id = ?1"
}

pub fn update_password() -> &'static str {
    "UPDATE users SET password_hash = ?1 WHERE id = ?2"
}

pub fn update_user() -> &'static str {
    "UPDATE users SET name = ?1, email = ?2, avatar_url = ?3 WHERE id = ?4"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_by_ids_builds_n_placeholders() {
        let sql = get_by_ids(0);
        assert_eq!(
            sql,
            "SELECT id, name, email, role, avatar_url FROM active_users WHERE id IN ()"
        );

        let sql = get_by_ids(3);
        assert_eq!(
            sql,
            "SELECT id, name, email, role, avatar_url FROM active_users WHERE id IN (?,?,?)"
        );
    }
}
