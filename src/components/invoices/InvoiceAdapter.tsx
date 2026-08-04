import React, { useState } from 'react';
import InvoiceEditor from './InvoiceEditor';
import { ClientInvoice, blankInvoice, syncInvoiceAmount } from '@/lib/invoiceUtils';
import { Quotation, useCurrentWorkspace } from '@/lib/queries';
import { toast } from 'sonner';

export interface InvoiceAdapterProps {
  quotation: Quotation | null;
  clientName: string;
  initialLineItems?: any[];
  readonly?: boolean;
  onSave?: (payload: any, isNew: boolean) => void;
  onClose: () => void;
}

export function InvoiceAdapter({ quotation, clientName, initialLineItems, readonly, onSave, onClose }: InvoiceAdapterProps) {
  const isNew = !quotation;
  const { data: workspace } = useCurrentWorkspace();
  const invoiceSettings = (() => {
    if (workspace?.workspaceId) {
      const local = localStorage.getItem(`invoiceSettings_${workspace.workspaceId}`);
      if (local) {
        try {
          return JSON.parse(local);
        } catch (e) {}
      }
    }
    return workspace?.invoiceSettings || {};
  })();
  
  // Convert Supabase Quotation to ClientInvoice for the Editor
  const [initialInvoice] = useState<ClientInvoice>(() => {
    if (isNew) {
      let empty = blankInvoice();
      
      // Override with workspace settings
      if (invoiceSettings.companyName) empty.companyName = invoiceSettings.companyName;
      if (invoiceSettings.companyGstin) empty.companyGstin = invoiceSettings.companyGstin;
      if (invoiceSettings.footerEmail) empty.footerEmail = invoiceSettings.footerEmail;
      if (invoiceSettings.footerWebsite) empty.footerWebsite = invoiceSettings.footerWebsite;
      
      if (invoiceSettings.companyAddressLine1) empty.companyAddressLine1 = invoiceSettings.companyAddressLine1;
      if (invoiceSettings.companyAddressLine2) empty.companyAddressLine2 = invoiceSettings.companyAddressLine2;
      if (invoiceSettings.companyAddressLine3) empty.companyAddressLine3 = invoiceSettings.companyAddressLine3;

      if (invoiceSettings.companyLogo) empty.companyLogo = invoiceSettings.companyLogo;
      if (invoiceSettings.upiId) empty.upiId = invoiceSettings.upiId;
      if (invoiceSettings.paymentAccount) empty.paymentCommunication = invoiceSettings.paymentAccount;
      
      if (invoiceSettings.defaultPaymentMode === 'bank' || invoiceSettings.defaultPaymentMode === 'both') {
        empty.showBankDetails = true;
        empty.bankName = invoiceSettings.bankName || empty.bankName;
        empty.bankAccountName = invoiceSettings.bankAccountName || empty.bankAccountName;
        empty.bankAccountNumber = invoiceSettings.bankAccountNumber || empty.bankAccountNumber;
        empty.bankIfsc = invoiceSettings.bankIfscCode || empty.bankIfsc;
      }
      
      if (invoiceSettings.defaultPaymentMode === 'bank') {
        empty.showPaymentQr = false;
      } else {
        empty.showPaymentQr = true;
        if (invoiceSettings.paymentQrCustomImage) {
           empty.paymentQrCustomImage = invoiceSettings.paymentQrCustomImage;
        }
      }
      
      const parsedLineItems = initialLineItems && initialLineItems.length > 0 
        ? initialLineItems.map((li: any, idx: number) => ({
            id: li.id || String(idx),
            description: li.description || '',
            hsnSac: li.hsn_sac || li.hsnSac || '998361',
            qty: li.qty || 1,
            unitPrice: li.unit_price || li.unitPrice || 0,
            taxLabel: li.tax_label || li.taxLabel || `IGST 18%`,
            taxRate: li.tax_rate !== undefined ? li.tax_rate : (li.taxRate !== undefined ? li.taxRate : 18),
          }))
        : empty.lineItems;

      return syncInvoiceAmount({
        ...empty,
        clientName: clientName,
        lineItems: parsedLineItems,
      });
    }
    
    // Parse extra_fields
    const extra = quotation.extra_fields || {};
    
    // Map line items
    const lineItems = Array.isArray(quotation.line_items) && quotation.line_items.length > 0 
      ? quotation.line_items.map((li: any, idx: number) => ({
          id: li.id || String(idx),
          description: li.description || '',
          hsnSac: li.hsn_sac || '998361',
          qty: li.qty || 1,
          unitPrice: li.unit_price || 0,
          taxLabel: li.tax_label || `IGST ${quotation.tax_rate || 18}%`,
          taxRate: li.tax_rate !== undefined ? li.tax_rate : (quotation.tax_rate || 18),
        })) 
      : blankInvoice().lineItems;
    
    return {
      id: quotation.id,
      invoiceNo: quotation.quotation_number,
      taxInvoiceTitle: extra.taxInvoiceTitle || `Tax Invoice ${quotation.quotation_number}`,
      projectName: extra.projectName || '',
      invoiceDate: quotation.issue_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      dueDate: quotation.valid_until?.split('T')[0] || new Date().toISOString().split('T')[0],
      source: extra.source || '',
      reference: extra.reference || '',
      amount: (quotation as any).final_amount || lineItems.reduce((acc: number, li: any) => acc + (li.qty * li.unitPrice * (1 + (li.taxRate / 100))), 0),
      status: (quotation.status as any) || 'Sent',
      currency: extra.currency || 'INR',
      companyTagline: extra.companyTagline || blankInvoice().companyTagline,
      companyAddressLine1: extra.companyAddressLine1 || blankInvoice().companyAddressLine1,
      companyAddressLine2: extra.companyAddressLine2 || blankInvoice().companyAddressLine2,
      companyAddressLine3: extra.companyAddressLine3 || blankInvoice().companyAddressLine3,
      companyGstin: extra.companyGstin || blankInvoice().companyGstin,
      clientName: quotation.client_name || clientName,
      clientAddress: extra.clientAddress || '',
      clientGstin: extra.clientGstin || '',
      placeOfSupply: extra.placeOfSupply || '',
      lineItems,
      totalInWords: extra.totalInWords || '',
      paymentCommunication: extra.paymentCommunication || quotation.quotation_number,
      paymentAccount: extra.paymentAccount || blankInvoice().paymentAccount,
      paymentQrId: extra.paymentQrId || 'primary',
      paymentQrCustomImage: extra.paymentQrCustomImage,
      upiId: extra.upiId || blankInvoice().upiId,
      showPaymentQr: extra.showPaymentQr !== false,
      showHsnSummary: extra.showHsnSummary !== false,
      footerEmail: extra.footerEmail || blankInvoice().footerEmail,
      footerWebsite: extra.footerWebsite || blankInvoice().footerWebsite,
      companyName: extra.companyName || blankInvoice().companyName,
      companyLogo: extra.companyLogo || blankInvoice().companyLogo,
      showBankDetails: extra.showBankDetails !== undefined ? extra.showBankDetails : blankInvoice().showBankDetails,
      bankName: extra.bankName || blankInvoice().bankName,
      bankAccountName: extra.bankAccountName || blankInvoice().bankAccountName,
      bankAccountNumber: extra.bankAccountNumber || blankInvoice().bankAccountNumber,
      bankIfsc: extra.bankIfsc || blankInvoice().bankIfsc,
    };
  });

  const handleSave = (inv: ClientInvoice) => {
    // Convert back to Supabase Quotation payload
    const payload = {
      status: inv.status,
      issue_date: new Date(inv.invoiceDate).toISOString(),
      valid_until: new Date(inv.dueDate).toISOString(),
      tax_rate: inv.lineItems.length > 0 ? inv.lineItems[0].taxRate : 18,
      line_items: inv.lineItems.map(li => ({
        id: li.id,
        description: li.description,
        hsn_sac: li.hsnSac,
        qty: li.qty,
        unit_price: li.unitPrice,
        tax_label: li.taxLabel,
        tax_rate: li.taxRate,
      })),
      extra_fields: {
        taxInvoiceTitle: inv.taxInvoiceTitle,
        projectName: inv.projectName,
        source: inv.source,
        reference: inv.reference,
        currency: inv.currency,
        companyName: inv.companyName,
        companyLogo: inv.companyLogo,
        companyTagline: inv.companyTagline,
        companyAddressLine1: inv.companyAddressLine1,
        companyAddressLine2: inv.companyAddressLine2,
        companyAddressLine3: inv.companyAddressLine3,
        companyGstin: inv.companyGstin,
        clientAddress: inv.clientAddress,
        clientGstin: inv.clientGstin,
        placeOfSupply: inv.placeOfSupply,
        totalInWords: inv.totalInWords,
        paymentCommunication: inv.paymentCommunication,
        paymentAccount: inv.paymentAccount,
        paymentQrId: inv.paymentQrId,
        paymentQrCustomImage: inv.paymentQrCustomImage,
        upiId: inv.upiId,
        showPaymentQr: inv.showPaymentQr,
        showBankDetails: inv.showBankDetails,
        bankName: inv.bankName,
        bankAccountName: inv.bankAccountName,
        bankAccountNumber: inv.bankAccountNumber,
        bankIfsc: inv.bankIfsc,
        showHsnSummary: inv.showHsnSummary,
        footerEmail: inv.footerEmail,
        footerWebsite: inv.footerWebsite,
        final_amount: inv.amount,
        total_amount: inv.amount,
      } as any
    };
    
    if (onSave) onSave(payload, isNew);
  };

  return (
    <div className="p-6 overflow-y-auto h-full w-full">
      <InvoiceEditor 
        invoice={initialInvoice} 
        isNew={isNew} 
        readonly={readonly}
        onSave={handleSave} 
        onBack={onClose} 
      />
    </div>
  );
}
