// Lecture SEULE des dispositions macOS via l API d Apple (UCKeyTranslate) : aucune frappe, aucun réglage modifié.
// Usage : swiftc -O scripts/dump-mac-layouts.swift -o /tmp/dump && /tmp/dump com.apple.keylayout.US com.apple.keylayout.British ... > macdump.json
// Nécessite macOS et les outils Xcode. Les identifiants (com.apple.keylayout.*) se listent avec TISCreateInputSourceList.
import Carbon
import Foundation

// Lecture SEULE : on interroge la table de disposition d'Apple (UCKeyTranslate) pour chaque touche et chaque état
// du clavier, sans activer la disposition ni envoyer de frappe. Rien n'est modifié dans les réglages du Mac.
let CODES: [UInt16: String] = [0:"KeyA",1:"KeyS",2:"KeyD",3:"KeyF",4:"KeyH",5:"KeyG",6:"KeyZ",7:"KeyX",8:"KeyC",9:"KeyV",10:"IntlBackslash",11:"KeyB",12:"KeyQ",13:"KeyW",14:"KeyE",15:"KeyR",16:"KeyY",17:"KeyT",18:"Digit1",19:"Digit2",20:"Digit3",21:"Digit4",22:"Digit6",23:"Digit5",24:"Equal",25:"Digit9",26:"Digit7",27:"Minus",28:"Digit8",29:"Digit0",30:"BracketRight",31:"KeyO",32:"KeyU",33:"BracketLeft",34:"KeyI",35:"KeyP",37:"KeyL",38:"KeyJ",39:"Quote",40:"KeyK",41:"Semicolon",42:"Backslash",43:"Comma",44:"Slash",45:"KeyN",46:"KeyM",47:"Period",50:"Backquote"]
let STATES: [(String, UInt32)] = [("l", 0), ("s", 2), ("g", 8), ("gs", 10)]  // (Maj = 2, Option = 8) décalés de 8 bits comme dans Carbon
func sprop(_ s: TISInputSource, _ k: CFString) -> String? { guard let p = TISGetInputSourceProperty(s, k) else { return nil }; return Unmanaged<AnyObject>.fromOpaque(p).takeUnretainedValue() as? String }
let wanted = Set(CommandLine.arguments.dropFirst())
let list = TISCreateInputSourceList(nil, true).takeRetainedValue() as! [TISInputSource]
var out: [String: Any] = [:]
let kbd = UInt32(LMGetKbdType())
for src in list {
  guard let id = sprop(src, kTISPropertyInputSourceID), wanted.contains(id),
        let dataPtr = TISGetInputSourceProperty(src, kTISPropertyUnicodeKeyLayoutData) else { continue }
  let cfData = Unmanaged<CFData>.fromOpaque(dataPtr).takeUnretainedValue()
  let layout = unsafeBitCast(CFDataGetBytePtr(cfData), to: UnsafePointer<UCKeyboardLayout>.self)
  func translate(_ key: UInt16, _ mods: UInt32, _ dead: inout UInt32) -> String {
    var len = 0; var chars = [UniChar](repeating: 0, count: 8)
    let r = UCKeyTranslate(layout, key, UInt16(kUCKeyActionDown), mods, kbd, 0, &dead, 8, &len, &chars)
    return r == noErr ? String(utf16CodeUnits: chars, count: len) : ""
  }
  var keys: [String: Any] = [:]
  var deadKeys: [(String, String, UInt16, UInt32)] = []
  for (kc, code) in CODES.sorted(by: { $0.key < $1.key }) {
    var entry: [String: Any] = [:]; var dead: [String: Any] = [:]
    for (lv, mods) in STATES {
      var st: UInt32 = 0
      let s = translate(kc, mods, &st)
      if st != 0 { dead[lv] = "dead"; deadKeys.append((code, lv, kc, mods)) }
      else if !s.isEmpty && s.unicodeScalars.first!.value >= 32 { entry[lv] = s }
    }
    if !dead.isEmpty { entry["dead"] = dead }
    if !entry.isEmpty { keys[code] = entry }
  }
  // Composition : touche morte puis une lettre (clé = lettre tapée, valeur = résultat) ; Espace donne le signe lui-même.
  var compose: [String: Any] = [:]
  for (code, lv, kc, mods) in deadKeys {
    var table: [String: String] = [:]
    var st0: UInt32 = 0; _ = translate(kc, mods, &st0)
    for (k2, c2) in CODES { for (_, m2) in STATES.prefix(2) {
      var st = st0; let r = translate(k2, m2, &st)
      guard let first = r.unicodeScalars.first, r.unicodeScalars.count >= 1 else { continue }
      _ = c2
      var st3 = UInt32(0); let plain = translate(k2, m2, &st3)
      if st3 == 0 && !plain.isEmpty && plain.unicodeScalars.count == 1 && plain.unicodeScalars.first!.properties.isAlphabetic { table[plain] = r; _ = first }
    } }
    var st = st0; table[" "] = translate(49, 0, &st)
    compose[code + "." + lv] = table
  }
  out[id] = ["keys": keys, "compose": compose, "kbdType": kbd]
}
let json = try! JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted, .sortedKeys])
FileHandle.standardOutput.write(json)
