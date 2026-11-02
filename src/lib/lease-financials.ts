const DEFAULT_DEPOSIT_MONTHS = 2
const DEFAULT_ADVANCE_RENT_MONTHS = 2

export function getLeaseMonthlyRent(monthlyRent?: number | null, propertyPrice?: number | null): number {
  return monthlyRent || propertyPrice || 0
}

export function getLeaseDepositAmount(monthlyRent?: number | null): number {
  const effectiveRent = getLeaseMonthlyRent(monthlyRent)
  return effectiveRent > 0 ? effectiveRent * DEFAULT_DEPOSIT_MONTHS : 0
}

export function getLeaseAdvanceRentAmount(monthlyRent?: number | null): number {
  const effectiveRent = getLeaseMonthlyRent(monthlyRent)
  return effectiveRent > 0 ? effectiveRent * DEFAULT_ADVANCE_RENT_MONTHS : 0
}

export function getLeaseAdvanceMonthLabels(startDate: string | Date): string {
  const baseDate = new Date(startDate)
  if (Number.isNaN(baseDate.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  const months = Array.from({ length: DEFAULT_ADVANCE_RENT_MONTHS }, (_, index) => {
    const nextMonth = new Date(baseDate)
    nextMonth.setMonth(baseDate.getMonth() + index)
    return formatter.format(nextMonth)
  })

  return months.join(' et ')
}
