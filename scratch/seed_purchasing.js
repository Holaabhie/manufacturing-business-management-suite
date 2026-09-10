async function seed() {
  // 1. Create Vendor
  const vendorRes = await fetch('http://localhost:3000/api/purchasing/vendors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Gujarat Steel & Metals Ltd',
      contactPerson: 'Rajesh Patel',
      phone: '+91 98250 12345',
      email: 'sales@gujaratsteel.in',
      address: 'Plot 42, GIDC Industrial Estate, Vatva, Ahmedabad',
      gstin: '24AAACG1234A1Z5'
    })
  });
  const vendorData = await vendorRes.json();
  console.log('Vendor created:', vendorData);

  const vendorId = vendorData.data?.id;
  if (!vendorId) return;

  // 2. Create Purchase Order
  const poRes = await fetch('http://localhost:3000/api/purchasing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorId: vendorId,
      vendorName: 'Gujarat Steel & Metals Ltd',
      taxPercent: 18,
      notes: 'Urgent delivery for September production run',
      addToInventory: false,
      items: [
        {
          inventoryItemId: '6a8d852eabec0e39a5a8ccfb',
          materialName: 'Aluminium Sheet 3mm',
          quantity: 100,
          unit: 'kg',
          unitPrice: 180
        },
        {
          inventoryItemId: '6a8d852eabec0e39a5a8ccfe',
          materialName: 'Copper Wire 2.5mm',
          quantity: 50,
          unit: 'metres',
          unitPrice: 95
        }
      ]
    })
  });
  const poData = await poRes.json();
  console.log('PO created:', poData);
}

seed();
