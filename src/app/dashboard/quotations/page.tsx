import { redirect } from 'next/navigation';

// Quotations now live next to invoices on one page.
export default function QuotationsPage() {
  redirect('/dashboard/invoices');
}
