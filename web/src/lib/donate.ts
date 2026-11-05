// PayPal account that receives donations: an email or Merchant ID. Leave empty to hide the widget.
export const PAYPAL_ACCOUNT = "aja.it.2019@gmail.com";

export const DONATION_AMOUNTS = [1, 5, 10] as const;

export function donateUrl(account: string, amount: number): string {
  const params = new URLSearchParams({
    business: account,
    amount: String(amount),
    currency_code: "USD",
    no_recurring: "1",
    item_name: "Support our team",
  });
  return `https://www.paypal.com/donate/?${params}`;
}
