async function seedMachines() {
  const m1 = await fetch('http://localhost:3000/api/machines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      machineName: 'CNC Lathe Machine #1',
      machineType: 'CNC Lathe',
      capacity: '500 units/hr'
    })
  });
  console.log('M1:', await m1.json());

  const m2 = await fetch('http://localhost:3000/api/machines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      machineName: 'Hydraulic Press 50T',
      machineType: 'Hydraulic Press',
      capacity: '50 Ton'
    })
  });
  console.log('M2:', await m2.json());
}
seedMachines();
