import { jsPDF } from 'jspdf';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'kwhite@vx360net.com';

  if (!SENDGRID_KEY) return res.status(500).json({ error: 'SendGrid not configured' });

  try {
    const {
      quoteNumber, company, contactName, contactEmail,
      signerName, signerTitle, signedAt, signatureData,
      monthlyRecurring, onetimeFees, totalDue, lineItems
    } = req.body;

    const signDate = new Date(signedAt).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    const signTime = new Date(signedAt).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit'
    });

    const fmt = (n) => (parseFloat(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // ========== GENERATE SIGNED PDF ==========
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = 612, H = 792;
    const margin = 50;
    let y = 0;

    // Header bar
    doc.setFillColor(15, 20, 25);
    doc.rect(0, 0, W, 80, 'F');
    // Gradient accent line
    doc.setFillColor(183, 28, 28);
    doc.rect(0, 76, W / 2, 4, 'F');
    doc.setFillColor(30, 136, 229);
    doc.rect(W / 2, 76, W / 2, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('VX-360 NETWORKS', margin, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('HOSTED PBX QUOTE', margin, 58);

    // Signed badge
    doc.setFillColor(6, 95, 70);
    doc.roundedRect(W - 200, 20, 150, 40, 6, 6, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('\u2713 SIGNED', W - 125, 45, { align: 'center' });

    y = 105;

    // Quote info section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Hosted PBX Quote', margin, y);
    y += 18;
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(quoteNumber || '', margin, y);
    y += 28;

    // Info grid
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text('PREPARED FOR', margin, y);
    doc.text('PREPARED BY', margin + 180, y);
    doc.text('QUOTE DATE', margin + 360, y);
    y += 14;
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(company || '', margin, y);
    doc.text('Kenneth White', margin + 180, y);
    const qDate = signedAt ? new Date(signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    doc.text(qDate, margin + 360, y);
    y += 14;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(contactName || '', margin, y);
    doc.text('VX-360 Networks, Inc', margin + 180, y);
    y += 30;

    // Line separator
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, W - margin, y);
    y += 20;

    // Line items table header
    doc.setFillColor(21, 101, 192);
    doc.rect(margin, y, W - margin * 2, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', margin + 10, y + 16);
    doc.text('QTY', margin + 290, y + 16, { align: 'center' });
    doc.text('MONTHLY', margin + 370, y + 16, { align: 'right' });
    doc.text('ONE-TIME', W - margin - 10, y + 16, { align: 'right' });
    y += 24;

    // Line items
    const items = Array.isArray(lineItems) ? lineItems : [];
    doc.setFont('helvetica', 'normal');
    items.forEach((item, i) => {
      if (y > H - 200) {
        doc.addPage();
        y = margin;
      }
      const bg = i % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg === 255 ? 255 : 250, bg === 255 ? 255 : 252);
      doc.rect(margin, y, W - margin * 2, 22, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.name || ''), margin + 10, y + 15);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(String(item.qty || 1), margin + 290, y + 15, { align: 'center' });
      doc.setTextColor(item.monthly > 0 ? 183 : 148, item.monthly > 0 ? 28 : 163, item.monthly > 0 ? 28 : 184);
      doc.text(item.monthly > 0 ? '$' + fmt(item.monthly) + '/mo' : '\u2014', margin + 370, y + 15, { align: 'right' });
      doc.setTextColor(30, 41, 59);
      doc.text(item.onetime > 0 ? '$' + fmt(item.onetime) : '\u2014', W - margin - 10, y + 15, { align: 'right' });
      y += 22;
    });

    // Subtotals row
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, W - margin * 2, 24, 'F');
    doc.setDrawColor(21, 101, 192);
    doc.setLineWidth(1.5);
    doc.line(margin, y, W - margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Subtotals', margin + 10, y + 16);
    doc.setTextColor(183, 28, 28);
    doc.text('$' + fmt(monthlyRecurring) + '/mo', margin + 370, y + 16, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    doc.text('$' + fmt(onetimeFees), W - margin - 10, y + 16, { align: 'right' });
    y += 40;

    // Totals box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.roundedRect(W - 260, y, 210, 80, 6, 6, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Monthly Recurring:', W - 250, y + 18);
    doc.setTextColor(183, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('$' + fmt(monthlyRecurring) + '/mo', W - 60, y + 18, { align: 'right' });

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('One-Time Fees:', W - 250, y + 34);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('$' + fmt(onetimeFees), W - 60, y + 34, { align: 'right' });

    doc.setFillColor(15, 20, 25);
    doc.roundedRect(W - 258, y + 46, 206, 28, 4, 4, 'F');
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Due at Signing:', W - 248, y + 64);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('$' + fmt(totalDue), W - 62, y + 65, { align: 'right' });

    y += 100;

    // Check if we need a new page for signature
    if (y > H - 180) {
      doc.addPage();
      y = margin;
    }

    // Signature section
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin, y, W - margin * 2, 140, 8, 8, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70);
    doc.text('ELECTRONIC SIGNATURE', margin + 16, y + 18);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 16, y + 24, margin + 200, y + 24);

    // Add signature image
    if (signatureData && signatureData.startsWith('data:image')) {
      try {
        doc.addImage(signatureData, 'PNG', margin + 16, y + 30, 180, 50);
      } catch (e) {
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('[Signature on file]', margin + 16, y + 55);
      }
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin + 16, y + 86, margin + 200, y + 86);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(signerName || '', margin + 16, y + 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text((signerTitle ? signerTitle + ' — ' : '') + (company || ''), margin + 16, y + 114);

    // Date on right side
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70);
    doc.text('DATE SIGNED', W - margin - 160, y + 18);
    doc.setDrawColor(226, 232, 240);
    doc.line(W - margin - 160, y + 24, W - margin - 16, y + 24);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(signDate, W - margin - 160, y + 40);
    doc.text(signTime, W - margin - 160, y + 54);

    y += 155;

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('This document was electronically signed and is a binding agreement between the parties.', W / 2, H - 40, { align: 'center' });
    doc.text('VX-360 Networks, Inc \u2022 (855) 360-9360 \u2022 vx360net.com', W / 2, H - 28, { align: 'center' });

    // Convert to base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    // ========== BUILD EMAILS ==========
    function buildEmailHtml(isCustomer) {
      var itemRows = '';
      if (lineItems && Array.isArray(lineItems)) {
        lineItems.forEach(function(item) {
          itemRows += '<tr>'
            + '<td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#1e293b">' + esc(item.name) + '</td>'
            + '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center;color:#475569">' + item.qty + '</td>'
            + '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;color:' + (item.monthly > 0 ? '#B71C1C' : '#94a3b8') + '">' + (item.monthly > 0 ? '$' + fmt(item.monthly) + '/mo' : '\u2014') + '</td>'
            + '<td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;color:#1e293b">' + (item.onetime > 0 ? '$' + fmt(item.onetime) : '\u2014') + '</td>'
            + '</tr>';
        });
      }

      var greeting = isCustomer
        ? '<p>Hi ' + esc((contactName || signerName || '').split(' ')[0]) + ',</p><p>Thank you for accepting our Hosted PBX quote. The signed agreement is attached as a PDF for your records.</p>'
        : '<p>Great news! <strong>' + esc(company || 'A customer') + '</strong> has signed quote <strong>' + esc(quoteNumber || '') + '</strong>. The signed agreement is attached.</p>';

      return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
        + '<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">'
        + '<div style="max-width:600px;margin:0 auto;padding:20px">'
        + '<div style="background:linear-gradient(135deg,#065f46,#059669);padding:24px 28px;border-radius:12px 12px 0 0;text-align:center">'
        + '<div style="font-size:36px;margin-bottom:8px">\u2705</div>'
        + '<div style="font-size:20px;font-weight:900;color:white">Quote Accepted &amp; Signed</div>'
        + '<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px">' + esc(quoteNumber || '') + ' \u2014 ' + esc(company || '') + '</div>'
        + '</div>'
        + '<div style="background:white;padding:0;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">'
        + '<div style="padding:24px 28px;font-size:14px;color:#333;line-height:1.6">' + greeting + '</div>'
        + '<div style="margin:0 28px 20px;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:16px 20px">'
        + '<div style="font-size:10px;font-weight:800;color:#065f46;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Signature Details</div>'
        + '<div style="font-size:13px;color:#1e293b;margin-bottom:6px"><strong>Signed by:</strong> ' + esc(signerName || '') + (signerTitle ? ' (' + esc(signerTitle) + ')' : '') + '</div>'
        + '<div style="font-size:13px;color:#1e293b;margin-bottom:6px"><strong>Company:</strong> ' + esc(company || '') + '</div>'
        + '<div style="font-size:13px;color:#1e293b"><strong>Date:</strong> ' + signDate + ' at ' + signTime + '</div></div>'
        + (itemRows ? '<div style="margin:0 28px 16px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">'
          + '<div style="background:#1565c0;padding:10px 14px"><div style="font-size:10px;font-weight:800;color:white;text-transform:uppercase;letter-spacing:1px">Services &amp; Pricing</div></div>'
          + '<table width="100%" cellpadding="0" cellspacing="0"><tr style="background:#f8fafc">'
          + '<th style="padding:8px 14px;text-align:left;font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Description</th>'
          + '<th style="padding:8px 10px;text-align:center;font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Qty</th>'
          + '<th style="padding:8px 10px;text-align:right;font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Monthly</th>'
          + '<th style="padding:8px 14px;text-align:right;font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;border-bottom:1px solid #e2e8f0">One-Time</th></tr>'
          + itemRows + '</table></div>'
          + '<div style="margin:0 28px 20px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">'
          + '<tr><td style="padding:10px 18px;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9">Monthly Recurring</td><td style="padding:10px 18px;text-align:right;font-size:13px;font-weight:800;color:#B71C1C;border-bottom:1px solid #f1f5f9">$' + fmt(monthlyRecurring) + '/mo</td></tr>'
          + '<tr><td style="padding:10px 18px;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9">One-Time Fees</td><td style="padding:10px 18px;text-align:right;font-size:13px;font-weight:800;color:#1e293b;border-bottom:1px solid #f1f5f9">$' + fmt(onetimeFees) + '</td></tr>'
          + '<tr style="background:#0f1419"><td style="padding:12px 18px;font-size:13px;color:rgba(255,255,255,0.7)">Total Due at Signing</td><td style="padding:12px 18px;text-align:right;font-size:18px;font-weight:900;color:white">$' + fmt(totalDue) + '</td></tr>'
          + '</table></div>' : '')
        + '<div style="padding:20px 28px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;text-align:center">'
        + '\uD83D\uDCCE The signed agreement PDF is attached to this email.<br>'
        + 'Both parties have received a copy for their records.</div>'
        + '</div>'
        + '<div style="text-align:center;padding:16px;font-size:10px;color:#94a3b8">VX-360 Networks, Inc \u2022 (855) 360-9360 \u2022 vx360net.com</div>'
        + '</div></body></html>';
    }

    var pdfFilename = 'Signed_Quote_' + (quoteNumber || 'Quote').replace(/[^a-zA-Z0-9-]/g, '_') + '.pdf';
    var subject = '\u2705 Signed: ' + (quoteNumber || 'Quote') + ' \u2014 ' + (company || 'Customer');

    var emails = [];
    emails.push({ to: NOTIFY_EMAIL, subject: '\uD83C\uDF89 ' + subject, html: buildEmailHtml(false) });
    if (contactEmail) {
      emails.push({ to: contactEmail, subject: subject, html: buildEmailHtml(true) });
    }

    var results = [];
    for (var i = 0; i < emails.length; i++) {
      var response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SENDGRID_KEY
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: emails[i].to }], subject: emails[i].subject }],
          from: { email: 'kwhite@vx360net.com', name: 'VX-360 Networks' },
          reply_to: { email: 'kwhite@vx360net.com', name: 'Kenneth White' },
          content: [{ type: 'text/html', value: emails[i].html }],
          attachments: [{
            content: pdfBase64,
            filename: pdfFilename,
            type: 'application/pdf',
            disposition: 'attachment'
          }]
        })
      });
      results.push({ to: emails[i].to, status: response.status });
    }

    return res.status(200).json({ success: true, results: results });
  } catch (e) {
    console.error('Notify error:', e);
    return res.status(500).json({ error: e.message });
  }
}
