const belowTwenty = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

const toWordsBelowHundred = (n) => {
  if (n < 20) return belowTwenty[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  return u ? `${tens[t]} ${belowTwenty[u]}` : tens[t]
}

const toWordsBelowThousand = (n) => {
  const h = Math.floor(n / 100)
  const rest = n % 100
  const parts = []
  if (h) parts.push(`${belowTwenty[h]} Hundred`)
  if (rest) parts.push(toWordsBelowHundred(rest))
  return parts.join(' ')
}

export const convertToWords = (num) => {
  if (!Number.isFinite(num) || num === 0) return ''

  const isNegative = num < 0
  const absolute = Math.abs(num)
  const integerPart = Math.floor(absolute)
  const decimalPart = Math.round((absolute - integerPart) * 100)

  const crores = Math.floor(integerPart / 10000000)
  const lakhs = Math.floor((integerPart % 10000000) / 100000)
  const thousands = Math.floor((integerPart % 100000) / 1000)
  const hundreds = integerPart % 1000

  const parts = []
  if (crores) parts.push(`${toWordsBelowThousand(crores)} Crore`)
  if (lakhs) parts.push(`${toWordsBelowThousand(lakhs)} Lakh`)
  if (thousands) parts.push(`${toWordsBelowThousand(thousands)} Thousand`)
  if (hundreds) parts.push(toWordsBelowThousand(hundreds))
  if (parts.length === 0) parts.push('Zero')

  let words = `${parts.join(' ')} Rupees`.replace(/\s+/g, ' ')
  if (decimalPart) words += ` and ${toWordsBelowHundred(decimalPart)} Paise`
  if (isNegative) words = `Minus ${words}`
  return words
}
