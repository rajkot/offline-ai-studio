import { NextResponse } from 'next/server';
import { SmartMacroDefinition } from '@/lib/automation/smartMacroEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const templates: SmartMacroDefinition[] = [
    {
      id: 'crm-lead-auto-filler',
      name: 'Zoho / Salesforce CRM Lead Entry',
      description: 'Automates batch customer lead generation into CRM web forms with dynamic CSV mapping and automatic alert handling.',
      targetUrl: 'https://crm.zoho.in/crm/leads/add',
      mode: 'browser',
      steps: [
        {
          id: 'step-navigate',
          action: 'navigate',
          targetIntent: 'Open CRM Lead Form Page',
          options: { timeoutMs: 12000 }
        },
        {
          id: 'step-name',
          action: 'smartFill',
          targetIntent: 'Customer Full Name or Contact Name',
          csvField: 'name',
          value: '{{csv.name}}',
          options: { delayAfterMs: 40 }
        },
        {
          id: 'step-email',
          action: 'smartFill',
          targetIntent: 'Customer Email Address',
          csvField: 'email',
          value: '{{csv.email}}',
          options: { delayAfterMs: 40 }
        },
        {
          id: 'step-phone',
          action: 'smartFill',
          targetIntent: 'Mobile Number or Contact Phone',
          csvField: 'phone',
          value: '{{csv.phone}}',
          options: { delayAfterMs: 40 }
        },
        {
          id: 'step-city',
          action: 'smartFill',
          targetIntent: 'City or Region',
          csvField: 'city',
          value: '{{csv.city}}',
          options: { optional: true, delayAfterMs: 40 }
        },
        {
          id: 'step-submit',
          action: 'smartClick',
          targetIntent: 'Save Lead or Submit Button',
          options: { confirmDialog: true, delayAfterMs: 1500 }
        }
      ],
      csvData: [
        { name: 'Rajesh Patel', email: 'rajesh@patelenterprises.in', phone: '9825012345', city: 'Surat' },
        { name: 'Amit Sharma', email: 'amit.sharma@techcorp.com', phone: '9819054321', city: 'Mumbai' },
        { name: 'Priya Joshi', email: 'priya.j@solutions.org', phone: '9426098765', city: 'Ahmedabad' }
      ]
    },
    {
      id: 'google-forms-survey-submitter',
      name: 'Google Forms / Feedback Auto-Submitter',
      description: 'Batch-submits customer feedback, survey questionnaires, or order requests into Google Forms and web portals.',
      targetUrl: 'https://docs.google.com/forms/u/0/',
      mode: 'browser',
      steps: [
        {
          id: 'form-open',
          action: 'navigate',
          targetIntent: 'Open Form',
          options: { timeoutMs: 10000 }
        },
        {
          id: 'field-applicant',
          action: 'smartFill',
          targetIntent: 'Your Name or Full Name',
          csvField: 'name',
          value: '{{csv.name}}'
        },
        {
          id: 'field-feedback',
          action: 'smartFill',
          targetIntent: 'Feedback, Remarks or Comments',
          csvField: 'comments',
          value: '{{csv.comments}}'
        },
        {
          id: 'form-submit',
          action: 'smartClick',
          targetIntent: 'Submit Form Button',
          options: { confirmDialog: true, delayAfterMs: 1200 }
        }
      ],
      csvData: [
        { name: 'Kavita Verma', comments: 'Excellent response time and clean UI experience.' },
        { name: 'Sanjay Mehta', comments: 'Prompt service and smooth workflow setup.' }
      ]
    },
    {
      id: 'ecommerce-inventory-updater',
      name: 'E-Commerce Product Stock & Price Updater',
      description: 'Navigates merchant catalog admin portals, enters SKU, modifies stock quantities, and saves product updates.',
      targetUrl: 'https://admin.shopify.com/store/products',
      mode: 'browser',
      steps: [
        {
          id: 'sku-search',
          action: 'smartFill',
          targetIntent: 'Product Search or SKU Input',
          csvField: 'sku',
          value: '{{csv.sku}}'
        },
        {
          id: 'sku-select',
          action: 'smartClick',
          targetIntent: 'Search or Enter'
        },
        {
          id: 'stock-qty',
          action: 'smartFill',
          targetIntent: 'Available Inventory Quantity or Stock',
          csvField: 'quantity',
          value: '{{csv.quantity}}'
        },
        {
          id: 'save-product',
          action: 'smartClick',
          targetIntent: 'Save Changes Button',
          options: { delayAfterMs: 1000 }
        }
      ],
      csvData: [
        { sku: 'LAPTOP-PRO-16', quantity: '24' },
        { sku: 'MOUSE-WIRELESS-V2', quantity: '150' }
      ]
    }
  ];

  return NextResponse.json(templates);
}
