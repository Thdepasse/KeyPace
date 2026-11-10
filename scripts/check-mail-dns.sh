#!/usr/bin/env bash
# Vérifie les enregistrements DNS de sécurité e-mail de keypace.be
# (DMARC, SPF, DKIM, MX, MTA-STS, TLS-RPT, BIMI, DNSSEC).
# Usage : bash scripts/check-mail-dns.sh [résolveur]   (par défaut 1.1.1.1)
D=keypace.be
R=${1:-1.1.1.1}
q() { printf '%-34s ' "$1 $2"; out=$(dig +short "$1" "$2" @"$R" | tr '\n' ' '); echo "${out:-(rien)}"; }

echo "== Messagerie"
q $D MX
q $D TXT | grep -i spf || echo "SPF                                (rien)"
q _dmarc.$D TXT
q selector1._domainkey.$D CNAME
q selector2._domainkey.$D CNAME
printf '%-34s ' "resend._domainkey.$D TXT"; dig +short resend._domainkey.$D TXT @"$R" | grep -q 'p=' && echo "clé présente" || echo "(rien)"

echo "== Transport"
q _mta-sts.$D TXT
q _smtp._tls.$D TXT
q mta-sts.$D CNAME
echo "-- politique MTA-STS :"
curl -sS --max-time 10 -D - "https://mta-sts.$D/.well-known/mta-sts.txt" 2>&1 | grep -iE '^(HTTP|content-type|location)|^(version|mode|mx|max_age):' || echo "(injoignable)"

echo "== BIMI"
q default._bimi.$D TXT

echo "== DNSSEC"
q $D DS
printf '%-34s ' "validation (flag ad)"; dig +dnssec $D SOA @"$R" | grep -q 'flags:.* ad' && echo "zone signée et validée" || echo "non validée"
