//! Centralized SQL statements for all entities.
//!
//! Each entity has its own module with pure SQL string functions.

use crate::types::SortState;

pub mod products;
pub mod stocks;
pub mod users;
pub mod variants;
pub mod warehouses;

pub fn build_paginated_query(base: &str, limit: i32, offset: i32) -> String {
    format!("{base} LIMIT {limit} OFFSET {offset}")
}

pub fn build_filtered_sorted_query(
    base: &str,
    where_clause: &str,
    sort: Option<&SortState>,
) -> String {
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

pub fn build_filtered_sorted_paginated_query(
    base: &str,
    where_clause: &str,
    sort: Option<&SortState>,
    limit: i32,
    offset: i32,
) -> String {
    build_paginated_query(
        build_filtered_sorted_query(base, where_clause, sort).as_str(),
        limit,
        offset,
    )
}
