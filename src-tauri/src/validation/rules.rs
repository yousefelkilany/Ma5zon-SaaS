pub fn validate_product(company: &str, name: &str, category: &str) -> Result<(), String> {
    if company.trim().is_empty() {
        return Err("company: required".to_string());
    }
    if company.len() > 100 {
        return Err("company: must be 100 characters or less".to_string());
    }
    if name.trim().is_empty() {
        return Err("name: required".to_string());
    }
    if name.len() > 200 {
        return Err("name: must be 200 characters or less".to_string());
    }
    if category.trim().is_empty() {
        return Err("category: required".to_string());
    }
    if category.len() > 100 {
        return Err("category: must be 100 characters or less".to_string());
    }
    Ok(())
}

pub fn validate_variant(
    sku: &str,
    variant_name: &str,
    uom_id: Option<&str>,
    retail_price: i64,
    wholesale_price: i64,
    distribution_price: i64,
) -> Result<(), String> {
    if sku.trim().is_empty() {
        return Err("sku: required".to_string());
    }
    if sku.len() > 50 {
        return Err("sku: must be 50 characters or less".to_string());
    }
    if !sku.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("sku: must be alphanumeric with dashes only".to_string());
    }
    if variant_name.trim().is_empty() {
        return Err("variant_name: required".to_string());
    }
    if variant_name.len() > 200 {
        return Err("variant_name: must be 200 characters or less".to_string());
    }
    if let Some(uom) = uom_id {
        if uom.len() > 50 {
            return Err("uom_id: must be 50 characters or less".to_string());
        }
    }
    if retail_price < 0 {
        return Err("retail_price: must be 0 or greater".to_string());
    }
    if wholesale_price < 0 {
        return Err("wholesale_price: must be 0 or greater".to_string());
    }
    if distribution_price < 0 {
        return Err("distribution_price: must be 0 or greater".to_string());
    }
    Ok(())
}

pub fn validate_warehouse(name: &str, location: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("name: required".to_string());
    }
    if name.len() > 100 {
        return Err("name: must be 100 characters or less".to_string());
    }
    if location.trim().is_empty() {
        return Err("location: required".to_string());
    }
    if location.len() > 200 {
        return Err("location: must be 200 characters or less".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_product_valid() {
        let result = validate_product("Acme Corp", "Widget", "Electronics");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_product_empty_company() {
        let result = validate_product("", "Widget", "Electronics");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "company: required");
    }

    #[test]
    fn test_validate_product_company_too_long() {
        let result = validate_product(&"x".repeat(101), "Widget", "Electronics");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "company: must be 100 characters or less"
        );
    }

    #[test]
    fn test_validate_variant_valid() {
        let result = validate_variant("SKU-001", "Blue Widget", Some("UNIT"), 10.0, 5.0, 3.0);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_variant_empty_sku() {
        let result = validate_variant("", "Blue Widget", None, 10.0, 5.0, 3.0);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "sku: required");
    }

    #[test]
    fn test_validate_variant_invalid_sku_chars() {
        let result = validate_variant("SKU@001!", "Blue Widget", None, 10.0, 5.0, 3.0);
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "sku: must be alphanumeric with dashes only"
        );
    }

    #[test]
    fn test_validate_warehouse_valid() {
        let result = validate_warehouse("Main Warehouse", "123 Main St");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_warehouse_empty_name() {
        let result = validate_warehouse("", "123 Main St");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "name: required");
    }

    #[test]
    fn test_validate_product_whitespace_only() {
        let result = validate_product("   ", "Widget", "Electronics");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "company: required");
    }

    #[test]
    fn test_validate_warehouse_whitespace_only() {
        let result = validate_warehouse("   ", "123 Main St");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "name: required");
    }

    #[test]
    fn test_validate_variant_sku_boundary_50_chars() {
        let result = validate_variant(&"A".repeat(50), "Blue Widget", None, 10.0, 5.0, 3.0);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_variant_sku_boundary_51_chars() {
        let result = validate_variant(&"A".repeat(51), "Blue Widget", None, 10.0, 5.0, 3.0);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "sku: must be 50 characters or less");
    }

    #[test]
    fn test_validate_product_name_boundary_200_chars() {
        let result = validate_product("Acme Corp", &"A".repeat(200), "Electronics");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_product_company_boundary_100_chars() {
        let result = validate_product(&"A".repeat(100), "Widget", "Electronics");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_variant_negative_wholesale_price() {
        let result = validate_variant("SKU-001", "Blue Widget", None, 1000, -500, 300);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "wholesale_price: must be 0 or greater");
    }

    #[test]
    fn test_validate_variant_negative_distribution_price() {
        let result = validate_variant("SKU-001", "Blue Widget", None, 1000, 500, -300);
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "distribution_price: must be 0 or greater"
        );
    }

    #[test]
    fn test_validate_variant_uom_id_too_long() {
        let result = validate_variant(
            "SKU-001",
            "Blue Widget",
            Some(&"U".repeat(51)),
            10.0,
            5.0,
            3.0,
        );
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "uom_id: must be 50 characters or less");
    }
}
