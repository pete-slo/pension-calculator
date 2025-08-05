async function loadDrawdownTable() {
  const response = await fetch('drawdown.csv');
  const csvText = await response.text();
  const rows = csvText.trim().split('\n').slice(1); // Skip header
  const table = {};
  rows.forEach(row => {
    const [age, percentage, minimum] = row.split(',').map(v => v.trim());
    table[parseInt(age)] = {
      percentage: parseFloat(percentage),
      minimum: parseFloat(minimum)
    };
  });
  return table;
}

document.getElementById('calc-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const age = parseInt(document.getElementById('age').value);
  const retirementAge = parseInt(document.getElementById('retirementAge').value);
  let fund = parseFloat(document.getElementById('fund').value);
  let contribution = parseFloat(document.getElementById('contribution').value);
  const growthRate = parseFloat(document.getElementById('growthRate').value) / 100;

  const lifeExpectancy = 90;

  // Load drawdown rules from CSV
  const drawdownTable = await loadDrawdownTable();

  // Accumulation phase
  let accumulation = [];
  for (let yr = age; yr < retirementAge; yr++) {
    accumulation.push({ age: yr, fund: fund.toFixed(2), contribution: contribution.toFixed(2) });
    fund += contribution;
    contribution *= (1 + growthRate);
  }

  // Drawdown phase
  let drawdown = [];
  for (let yr = retirementAge; yr < lifeExpectancy; yr++) {
    const rules = drawdownTable[yr];
    if (!rules) break; // Stop if no rules for this age

    const pctAmount = fund * rules.percentage;
    const amount = Math.max(pctAmount, rules.minimum);

    drawdown.push({ age: yr, drawdown: amount.toFixed(2) });
    fund -= amount;
    if (fund <= 0) break;
  }

  // Output results
  let output = "<h2>Results</h2>";
  output += "<h3>Accumulation Phase</h3><table border='1'><tr><th>Age</th><th>Fund (£)</th><th>Contribution (£)</th></tr>";
  accumulation.forEach(row => {
    output += `<tr><td>${row.age}</td><td>${row.fund}</td><td>${row.contribution}</td></tr>`;
  });
  output += "</table>";

  output += "<h3>Drawdown Phase</h3><table border='1'><tr><th>Age</th><th>Annual Drawdown (£)</th></tr>";
  drawdown.forEach(row => {
    output += `<tr><td>${row.age}</td><td>${row.drawdown}</td></tr>`;
  });
  output += "</table>";

  document.getElementById('results').innerHTML = output;
});
