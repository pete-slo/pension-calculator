document.getElementById('calc-form').addEventListener('submit', function (e) {
  e.preventDefault();

  // Get input values
  const age = parseInt(document.getElementById('age').value);
  const retirementAge = parseInt(document.getElementById('retirementAge').value);
  const fund = parseFloat(document.getElementById('fund').value);
  const contribution = parseFloat(document.getElementById('contribution').value);
  const growthRate = parseFloat(document.getElementById('growthRate').value) / 100;

  // Constants
  const lifeExpectancy = 90;

  // Step 1: Accumulate pension to retirement
  let currentFund = fund;
  let annualContribution = contribution;
  let accumulation = [];

  for (let year = age; year < retirementAge; year++) {
    accumulation.push({ year, fund: currentFund.toFixed(2), contribution: annualContribution.toFixed(2) });
    currentFund += annualContribution;
    annualContribution *= (1 + growthRate);
  }

  // Step 2: Calculate drawdown
  const retirementYears = lifeExpectancy - retirementAge;
  const annualDrawdown = currentFund / retirementYears;
  let drawdown = [];

  for (let year = retirementAge; year < lifeExpectancy; year++) {
    drawdown.push({ year, drawdown: annualDrawdown.toFixed(2) });
  }

  // Step 3: Display results
  let output = "<h2>Results</h2>";

  output += "<h3>Accumulation Phase</h3><table border='1'><tr><th>Age</th><th>Fund (œ)</th><th>Contribution (œ)</th></tr>";
  accumulation.forEach(row => {
    output += `<tr><td>${row.year}</td><td>${row.fund}</td><td>${row.contribution}</td></tr>`;
  });
  output += "</table>";

  output += "<h3>Drawdown Phase</h3><table border='1'><tr><th>Age</th><th>Annual Drawdown (œ)</th></tr>";
  drawdown.forEach(row => {
    output += `<tr><td>${row.year}</td><td>${row.drawdown}</td></tr>`;
  });
  output += "</table>";

  document.getElementById('results').innerHTML = output;
});
