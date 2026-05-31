//! Product seed data - Egyptian pharmaceutical products
//!
//! Base drug names only. Strength/form combinations are handled by variants.

use rusqlite::Connection;
use chrono::Local;

pub const PRODUCTS: &[(&str, &str, &str)] = &[
    // OTC Medicines
    ("Pharco فاركو", "Acetaminophen باراسيتامول", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Ibuprofen إيبوبروفين", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Omeprazole أوميبرازول", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Paracetamol باراسيتامول", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Vitamin C فيتامين سي", "OTC Medicines أدوية بدون روشتة"),
    ("Pharco فاركو", "Multivitamin فيتامينات متعددة", "OTC Medicines أدوية بدون روشتة"),
    // Prescription Medicines
    ("Amoun آمون", "Amoxicillin أموكسيسيلين", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Azithromycin أزيثرومايسين", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Ceftriaxone سيفترياكسون", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Metronidazole ميترونيدازول", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Lansoprazole لانسوبرازول", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Metformin ميتفورمين", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Glimepiride غليمبيريد", "Prescription Medicines أدوية روشتة"),
    ("Amoun آمون", "Enalapril إينالابريل", "Prescription Medicines أدوية روشتة"),
    // Supplements
    ("Eva Pharm إيفا فارم", "Calcium + Vitamin D كالسيوم + فيتامين د", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Zinc زنك", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Magnesium مغنيسيوم", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Iron حديد", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Vitamin B-Complex فيتامين ب كومبلكس", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Omega-3 أوميغا-3", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Collagen كولاجين", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Protein Powder بروتين بودرة", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "Creatine كرياتين", "Supplements مكملات غذائية"),
    ("Eva Pharm إيفا فارم", "BCAA بي سي أي إيه", "Supplements مكملات غذائية"),
    // Medical Devices
    ("Siemens Healthineers سيمنس هيلثينيرز", "Glucometer جهاز قياس السكر", "Medical Devices أجهزة طبية"),
    ("Siemens Healthineers سيمنس هيلثينيرز", "Glucose Test Strips شرائط قياس السكر", "Medical Devices أجهزة طبية"),
    ("Siemens Healthineers سيمنس هيلثينيرز", "Blood Pressure Monitor جهاز قياس الضغط", "Medical Devices أجهزة طبية"),
    ("Siemens Healthineers سيمنس هيلثينيرز", "Digital Thermometer جهاز قياس الحرارة", "Medical Devices أجهزة طبية"),
    ("Siemens Healthineers سيمنس هيلثينيرز", "Pulse Oximeter جهاز قياس الأكسجين", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "First Aid Kit طقم الإسعاف الأولي", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "Medical Masks أقنعة طبية", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "Alcohol Swabs قطع كحول", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "Surgical Tape شريط جراحي", "Medical Devices أجهزة طبية"),
    ("3M ثري إم", "Bandages bandages", "Medical Devices أجهزة طبية"),
    // Cosmetics
    ("Nivea نيفيا", "Moisturizing Cream كريم مرطب", "Cosmetics تجميل"),
    ("Nivea نيفيا", "Face Wash غسول يومي للوجه", "Cosmetics تجميل"),
    ("Nivea نيفيا", "Sun Protection واقي شمس", "Cosmetics تجميل"),
    ("Nivea نيفيا", "Vitamin C Serum سيروم فيتامين سي", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Anti-Aging Cream كريم مكافحة الشيخوخة", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Hydrating Serum سيروم ترطيب", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Hair Shampoo شامبو للشعر", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Hair Conditioner بلسم للشعر", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Face Mask ماسك وجه", "Cosmetics تجميل"),
    ("L'Oréal لوريال", "Lipstick أحمر شفاه", "Cosmetics تجميل"),
    // Veterinary
    ("Memphis Pharm ممفيس فارم", "Enrofloxacin إنروفلوكساسين", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Ivermectin إيفرميكتين", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Vitamin B Complex فيتامين ب كومبلكس", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Dewormer طارد للديدان", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Oxytetracycline أوكسيتيتراسيكلين", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Anti-Flea Spray بخاخ مضاد للبراغيث", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Pet Vitamin Syrup فيتامين حيوانات شراب", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Electrolyte Solution محلول إلكتروليت", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Wound Healing Spray بخاخ التئام الجروح", "Veterinary طب بيطري"),
    ("Memphis Pharm ممفيس فارم", "Eye Drops for Animals قطرات عين للحيوانات", "Veterinary طب بيطري"),
    // Additional products
    ("Novartis نوفارتس", "Diclofenac ديكلوفيناك", "OTC Medicines أدوية بدون روشتة"),
    ("GSK جي إس كي", "Ranitidine رانيتيدين", "Prescription Medicines أدوية روشتة"),
    ("Bayer باير", "Aspirin أسبرين", "OTC Medicines أدوية بدون روشتة"),
    ("Pfizer فايزر", "Sildenafil سيلدينافيل", "Prescription Medicines أدوية روشتة"),
    ("Pfizer فايزر", "Tamsulosin تامسولوسين", "Prescription Medicines أدوية روشتة"),
    ("MERCK ميرك", "Ferrous Sulfate سلفات الحديد", "Supplements مكملات غذائية"),
    ("MERCK ميرك", "Ferrous Gluconate غلوكونات الحديد", "Supplements مكملات غذائية"),
    ("Hikma هشامة", "Amlodipine أملوديبين", "Prescription Medicines أدوية روشتة"),
    ("Hikma هشامة", "Atorvastatin أتورفاستاتين", "Prescription Medicines أدوية روشتة"),
    ("Octoplus أوكتوبلس", "Vitamin D3 فيتامين د3", "Supplements مكملات غذائية"),
    ("Octoplus أوكتوبلس", "Vitamin B12 فيتامين ب12", "Supplements مكملات غذائية"),
    ("Octoplus أوكتوبلس", "Folic Acid حمض الفوليك", "Supplements مكملات غذائية"),
    ("Octoplus أوكتوبلس", "Biotin بيوتين", "Supplements مكملات غذائية"),
    ("Jamjoon جومجون", "Clotrimazole كلوتريمازول", "OTC Medicines أدوية بدون روشتة"),
    ("Jamjoon جومجون", "Miconazole ميكونازول", "OTC Medicines أدوية بدون روشتة"),
    ("Jamjoon جومجون", "Ketoconazole كيتوكونازول", "OTC Medicines أدوية بدون روشتة"),
];

pub fn seed(conn: &Connection) -> Result<(), String> {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    for product in PRODUCTS {
        conn.execute(
            "INSERT INTO products (company, name, category, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            [product.0, product.1, product.2, &now, &now],
        )
        .map_err(|e| format!("Failed to insert product {}: {}", product.1, e))?;
    }

    log::info!("[seed:products] Inserted {} products", PRODUCTS.len());
    Ok(())
}