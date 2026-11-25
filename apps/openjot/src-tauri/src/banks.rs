//! Registry of Thai bank and e-wallet apps that MooJot can recognise from
//! payment slips and screenshots.

use serde::{Deserialize, Serialize};

/// A Thai bank or e-wallet app.
///
/// `Deserialize` only accepts an `id` and resolves it to the canonical entry in
/// [`ALL_BANKS`]: `&'static str` fields cannot be filled from arbitrary input.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(try_from = "BankIdRef")]
pub struct BankDef {
    /// Stable slug, e.g. `"kbank"`.
    pub id: &'static str,
    /// Three-digit Bank of Thailand code. `None` for wallets without one.
    /// Apps that share a code with a parent bank repeat it (MAKE -> `"004"`).
    pub bot_code: Option<&'static str>,
    pub name_en: &'static str,
    pub name_th: &'static str,
    /// `"bank"` or `"wallet"`.
    pub kind: &'static str,
    /// Brand colour as a `#rrggbb` hex string.
    pub color: &'static str,
    /// Lowercase substrings matched case-insensitively against Android
    /// MediaStore bucket / relative-path names.
    pub album_keywords: &'static [&'static str],
    /// True when the app saves screenshots into a folder shared with other
    /// apps, so the album name alone cannot identify it.
    pub uses_shared_album: bool,
}

#[derive(Deserialize)]
struct BankIdRef {
    id: String,
}

impl TryFrom<BankIdRef> for BankDef {
    type Error = String;

    fn try_from(raw: BankIdRef) -> Result<Self, Self::Error> {
        bank_by_id(&raw.id)
            .cloned()
            .ok_or_else(|| format!("unknown bank id `{}`", raw.id))
    }
}

pub const ALL_BANKS: &[BankDef] = &[
    BankDef {
        id: "kbank",
        bot_code: Some("004"),
        name_en: "K PLUS",
        name_th: "ธนาคารกสิกรไทย",
        kind: "bank",
        color: "#138F2D",
        album_keywords: &["k plus", "kplus", "kasikorn"],
        uses_shared_album: false,
    },
    BankDef {
        id: "scb",
        bot_code: Some("014"),
        name_en: "SCB",
        name_th: "ธนาคารไทยพาณิชย์",
        kind: "bank",
        color: "#4E2A84",
        album_keywords: &["scb"],
        uses_shared_album: false,
    },
    BankDef {
        id: "ktb",
        bot_code: Some("006"),
        name_en: "Krungthai NEXT",
        name_th: "ธนาคารกรุงไทย",
        kind: "bank",
        color: "#1BA5E0",
        album_keywords: &["krungthai", "ktb next", "ktbnext"],
        uses_shared_album: true,
    },
    BankDef {
        id: "bbl",
        bot_code: Some("002"),
        name_en: "Bualuang mBanking",
        name_th: "ธนาคารกรุงเทพ",
        kind: "bank",
        color: "#1E4598",
        album_keywords: &["bualuang", "bangkok bank"],
        uses_shared_album: false,
    },
    BankDef {
        id: "ttb",
        bot_code: Some("011"),
        name_en: "ttb touch",
        name_th: "ทหารไทยธนชาต",
        kind: "bank",
        color: "#F26B21",
        album_keywords: &["ttb touch", "ttbtouch", "ttb"],
        uses_shared_album: false,
    },
    BankDef {
        id: "gsb",
        bot_code: Some("030"),
        name_en: "MyMo",
        name_th: "ธนาคารออมสิน",
        kind: "bank",
        color: "#EB198D",
        album_keywords: &["mymo", "gsb"],
        uses_shared_album: true,
    },
    BankDef {
        id: "bay",
        bot_code: Some("025"),
        name_en: "Krungsri",
        name_th: "ธนาคารกรุงศรีอยุธยา",
        kind: "bank",
        color: "#FEC43B",
        album_keywords: &["krungsri"],
        uses_shared_album: false,
    },
    BankDef {
        id: "truemoney",
        bot_code: None,
        name_en: "TrueMoney Wallet",
        name_th: "ทรูมันนี่",
        kind: "wallet",
        color: "#F36F21",
        album_keywords: &["truemoney", "true money", "truewallet", "true wallet"],
        uses_shared_album: false,
    },
    BankDef {
        id: "make",
        bot_code: Some("004"),
        name_en: "MAKE by KBank",
        name_th: "เมค",
        kind: "wallet",
        color: "#00C389",
        album_keywords: &["make by kbank", "makebykbank"],
        uses_shared_album: false,
    },
    BankDef {
        id: "paotang",
        bot_code: Some("006"),
        name_en: "Paotang",
        name_th: "เป๋าตัง",
        kind: "wallet",
        color: "#1B65B5",
        album_keywords: &["paotang", "pao tang", "เป๋าตัง"],
        uses_shared_album: false,
    },
    BankDef {
        id: "cimb",
        bot_code: Some("022"),
        name_en: "CIMB Thai",
        name_th: "ซีไอเอ็มบี ไทย",
        kind: "bank",
        color: "#C8102E",
        album_keywords: &["cimb"],
        uses_shared_album: false,
    },
    BankDef {
        id: "uob",
        bot_code: Some("024"),
        name_en: "UOB",
        name_th: "ธนาคารยูโอบี",
        kind: "bank",
        color: "#0C2074",
        album_keywords: &["uob"],
        uses_shared_album: false,
    },
    BankDef {
        id: "clicx",
        bot_code: Some("088"),
        name_en: "CLICX",
        name_th: "คลิกซ์",
        kind: "bank",
        color: "#FF5A1F",
        album_keywords: &["clicx"],
        uses_shared_album: false,
    },
    BankDef {
        id: "kept",
        bot_code: Some("025"),
        name_en: "Kept",
        name_th: "คีพ",
        kind: "bank",
        color: "#F7B500",
        album_keywords: &["kept"],
        uses_shared_album: false,
    },
    BankDef {
        id: "dime",
        bot_code: Some("069"),
        name_en: "DIME",
        name_th: "ไดม์",
        kind: "bank",
        color: "#F04E98",
        album_keywords: &["dime"],
        uses_shared_album: false,
    },
    BankDef {
        id: "kkp",
        bot_code: Some("069"),
        name_en: "KKP",
        name_th: "เกียรตินาคินภัทร",
        kind: "bank",
        color: "#592C88",
        album_keywords: &["kkp", "kiatnakin"],
        uses_shared_album: false,
    },
    BankDef {
        id: "ghb",
        bot_code: Some("033"),
        name_en: "GHB ALL",
        name_th: "ธนาคารอาคารสงเคราะห์",
        kind: "bank",
        color: "#E97826",
        album_keywords: &["ghb all", "ghb"],
        uses_shared_album: false,
    },
    BankDef {
        id: "baac",
        bot_code: Some("034"),
        name_en: "BAAC",
        name_th: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
        kind: "bank",
        color: "#2E7D32",
        album_keywords: &["baac", "baac mobile"],
        uses_shared_album: false,
    },
    BankDef {
        id: "tisco",
        bot_code: Some("067"),
        name_en: "TISCO",
        name_th: "ทิสโก้",
        kind: "bank",
        color: "#0A3D74",
        album_keywords: &["tisco"],
        uses_shared_album: false,
    },
    BankDef {
        id: "lhb",
        bot_code: Some("073"),
        name_en: "LH Bank",
        name_th: "ธนาคารแลนด์ แอนด์ เฮ้าส์",
        kind: "bank",
        color: "#00A651",
        album_keywords: &["lh bank", "lhbank", "lh mobile"],
        uses_shared_album: false,
    },
];

/// Looks up a bank or wallet by its slug (e.g. `"scb"`).
pub fn bank_by_id(id: &str) -> Option<&'static BankDef> {
    ALL_BANKS.iter().find(|bank| bank.id == id)
}

/// Looks up the first registry entry with the given three-digit BOT code.
///
/// Apps that share a code with a parent bank come after it in [`ALL_BANKS`],
/// so this returns the parent (e.g. `"004"` -> `kbank`, not `make`).
pub fn bank_by_bot_code(code: &str) -> Option<&'static BankDef> {
    ALL_BANKS.iter().find(|bank| bank.bot_code == Some(code))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_has_twenty_unique_entries() {
        assert_eq!(ALL_BANKS.len(), 20);
        let mut ids: Vec<&str> = ALL_BANKS.iter().map(|b| b.id).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), 20);
    }

    #[test]
    fn only_krungthai_and_mymo_use_shared_album() {
        let shared: Vec<&str> = ALL_BANKS
            .iter()
            .filter(|b| b.uses_shared_album)
            .map(|b| b.id)
            .collect();
        assert_eq!(shared, vec!["ktb", "gsb"]);
    }

    #[test]
    fn lookup_by_id_and_bot_code() {
        assert_eq!(bank_by_id("scb").and_then(|b| b.bot_code), Some("014"));
        assert!(bank_by_id("nope").is_none());
        assert_eq!(bank_by_bot_code("004").map(|b| b.id), Some("kbank"));
        assert_eq!(bank_by_bot_code("025").map(|b| b.id), Some("bay"));
        assert!(bank_by_bot_code("999").is_none());
        assert!(bank_by_id("truemoney").is_some_and(|b| b.bot_code.is_none()));
    }

    #[test]
    fn deserialises_by_id_to_canonical_entry() {
        let bank: BankDef = serde_json::from_str(r#"{"id":"kbank"}"#).expect("known id");
        assert_eq!(bank.name_en, "K PLUS");
        assert!(serde_json::from_str::<BankDef>(r#"{"id":"unknown"}"#).is_err());
    }
}
