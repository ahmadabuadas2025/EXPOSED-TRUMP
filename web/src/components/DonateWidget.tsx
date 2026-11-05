import { DONATION_AMOUNTS, PAYPAL_ACCOUNT, donateUrl } from "../lib/donate";

export function DonateWidget() {
  if (!PAYPAL_ACCOUNT) return null;

  return (
    <aside aria-label="Support our team" className="fixed bottom-3 right-3 z-30 flex items-center gap-2 rounded-full border border-line bg-raised py-1.5 pl-4 pr-1.5 shadow-lg shadow-black/40">
      <p className="whitespace-nowrap text-[13px] font-semibold text-ink">Support our team</p>
      <div className="flex gap-1">
        {DONATION_AMOUNTS.map((amount) => (
          <a key={amount} href={donateUrl(PAYPAL_ACCOUNT, amount)} target="_blank" rel="noopener noreferrer"
            aria-label={`Donate $${amount} with PayPal (opens in a new tab)`} title={`Donate $${amount} with PayPal`}
            className="grid h-9 min-w-9 place-items-center rounded-full bg-accent px-2.5 text-sm font-semibold text-accentInk hover:brightness-110">
            ${amount}
          </a>
        ))}
      </div>
    </aside>
  );
}
