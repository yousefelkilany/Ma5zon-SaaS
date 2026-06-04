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
    group_by: &str,
    sort: Option<&SortState>,
) -> String {
    let conditioned = if where_clause.is_empty() {
        base.to_string()
    } else {
        format!("{base} WHERE {where_clause}")
    };

    let grouped = if group_by.is_empty() {
        conditioned
    } else {
        format!("{conditioned} GROUP BY {group_by}")
    };

    match sort {
        Some(s) => format!("{grouped} ORDER BY {} {}", s.column_id, s.direction),
        None => format!("{grouped} ORDER BY name"),
    }
}

pub fn build_filtered_grouped_sorted_paginated_query(
    base: &str,
    where_clause: &str,
    group_by: &str,
    sort: Option<&SortState>,
    limit: i32,
    offset: i32,
) -> String {
    build_paginated_query(
        build_filtered_sorted_query(base, where_clause, group_by, sort).as_str(),
        limit,
        offset,
    )
}
