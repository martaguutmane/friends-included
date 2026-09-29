"use client";

import { useActionState } from "react";
import { decideExpense, decideSale, linkTelegram, submitExpense, submitSale, type ActionState } from "./actions";

const initial: ActionState = { ok: false, message: "" };

function Submit({ label }: { label: string }) { return <button type="submit">{label}</button>; }
function Result({ state }: { state: ActionState }) { return state.message ? <p className={state.ok ? "success" : "error"}>{state.message}</p> : null; }

export function SaleForm() {
  const [state, action] = useActionState(submitSale, initial);
  return <form action={action} className="form"><label>Reference<input name="reference" required /></label><label>Customer<input name="customer" required /></label><label>Project<select name="project"><option>A</option><option>B</option></select></label><label>Description<textarea name="description" required /></label><label>Amount EUR<input name="amount" type="number" min="0.01" step="0.01" required /></label><fieldset><legend>Proposed commission split</legend><label>Richard %<input name="proposedRichard" type="number" min="0" max="100" required /></label><label>Anastasia %<input name="proposedAnastasia" type="number" min="0" max="100" required /></label><label>Jean-Claude %<input name="proposedJeanClaude" type="number" min="0" max="100" required /></label></fieldset><Submit label="Submit sale" /><Result state={state} /></form>;
}
export function ExpenseForm() {
  const [state, action] = useActionState(submitExpense, initial);
  return <form action={action} className="form"><label>Reference<input name="reference" required /></label><label>Description<textarea name="description" required /></label><label>Category<select name="category"><option>Materials</option><option>Travel</option><option>Other</option></select></label><label>Amount EUR<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Proposed allocation<select name="proposedAllocation"><option value="A">Project A</option><option value="B">Project B</option><option value="COMPANY">Company overhead</option></select></label><Submit label="Submit expense" /><Result state={state} /></form>;
}
export function SaleDecision({ reference, split }: { reference: string; split: [number,number,number] }) {
  const [state, action] = useActionState(decideSale, initial);
  return <form action={action} className="inline-form"><input type="hidden" name="reference" value={reference}/><input aria-label="Richard final percent" name="richard" type="number" defaultValue={split[0]} /><input aria-label="Anastasia final percent" name="anastasia" type="number" defaultValue={split[1]} /><input aria-label="Jean-Claude final percent" name="jeanClaude" type="number" defaultValue={split[2]} /><Submit label="Approve sale"/><Result state={state}/></form>;
}
export function ExpenseDecision({ reference, proposed }: { reference: string; proposed: string }) {
  const [state, action] = useActionState(decideExpense, initial);
  return <form action={action} className="inline-form"><input type="hidden" name="reference" value={reference}/><select name="finalAllocation" defaultValue={proposed}><option value="A">Project A</option><option value="B">Project B</option><option value="COMPANY">Company overhead</option></select><Submit label="Allocate expense"/><Result state={state}/></form>;
}
export function TelegramLinkForm() {
  const [state, action] = useActionState(linkTelegram, initial);
  return <form action={action} className="form compact"><label>Employee<select name="employee"><option value="richard">Richard</option><option value="anastasia">Anastasia</option><option value="jean_claude">Jean-Claude</option><option value="kevin">Kevin</option></select></label><label>Telegram user ID<input name="telegramUserId" inputMode="numeric" required /></label><label>Telegram chat ID<input name="telegramChatId" inputMode="numeric" required /></label><Submit label="Save Telegram link"/><Result state={state}/></form>;
}
