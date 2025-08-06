// Load drawdown table from CSV
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

function addCustomIncrement(input, increment) {
  // Handle keyboard arrow keys
  input.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.value = (parseFloat(this.value) || 0) + increment;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.value = Math.max((parseFloat(this.value) || 0) - increment, 0);
    }
  });

  // Handle mouse clicks on spinner arrows
  input.addEventListener('input', function(e) {
    // Ignore if user typed a value manually
    if (this.matches(':focus')) return;
    let current = parseFloat(this.value) || 0;
    // Snap to nearest increment when spinner clicked
    this.value = Math.round(current / increment) * increment;
  });
}

// Apply to Fund (10,000) and Contribution (1,000)
addCustomIncrement(document.getElementById('fund'), 10000);
addCustomIncrement(document.getElementById('contribution'), 1000);



document.getElementById('calc-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  // Inputs
  const age = parseInt(document.getElementById('age').value);
  const retirementAge = parseInt(document.getElementById('retirementAge').value);

  // Validation checks
  if (retirementAge <= age) {
    alert("Retirement age must be greater than your current age.");
    return; // stop calculation
  }

  if (retirementAge < 50 || retirementAge > 79) {
    alert("Retirement age must be between 50 and 79.");
    return; // stop calculation
  }


  let fund = parseFloat(document.getElementById('fund').value);
  let contribution = parseFloat(document.getElementById('contribution').value);
  const growthRate = parseFloat(document.getElementById('growthRate').value) / 100;
  const roi = parseFloat(document.getElementById('roi').value) / 100; // Return on investment %

  const lifeExpectancy = 100;

  // Load Cayman drawdown rules
  const drawdownTable = await loadDrawdownTable();

  // -----------------
  // Accumulation phase
  // -----------------
  let accumulation = [];
  for (let yr = age; yr < retirementAge; yr++) {
  // Calculate investment growth for the year (approximate average balance)
  const growth = roi * (fund + contribution / 2);
  accumulation.push({
    year: (new Date().getFullYear() + (yr - age)), // <-- Calendar year
    age: yr,
    fund: fund.toFixed(2),
    contribution: contribution.toFixed(2),
    growth: growth.toFixed(2)
  });
  fund += contribution + growth;
  contribution *= (1 + growthRate);
  }


  // -----------------
  // Drawdown phase
  // -----------------

	let drawdown = [];
	for (let yr = retirementAge; yr < lifeExpectancy; yr++) {
    const rules = drawdownTable[yr];
    if (!rules) break;
  
    if (fund <= 0) break; // stop immediately if no funds remain
  
    const startBalance = fund;
    const pctAmount = startBalance * rules.percentage;
  
    // Calculate allowed drawdown (capped at available funds)
    let amount = Math.max(pctAmount, rules.minimum);
    let growth = roi * (startBalance - (amount / 2));
  
    // If taking all remaining funds, no growth applies and stop afterwards
    if (amount >= startBalance) {
      amount = startBalance;
      growth = 0;
    }
  
    drawdown.push({
      year: (new Date().getFullYear() + (yr - age)),
      age: yr,
      balance: startBalance.toFixed(2),
      percentage: (rules.percentage * 100).toFixed(2),
      drawdown: amount.toFixed(2),
      growth: growth.toFixed(2)
    });
    
    // Insert special note row at age 89 if funds remain
    if (yr === 89 && fund > 0) {
      drawdown.push({
        note: "At age 89, you may take the remaining balance as a lump sum."
      });
    }
    
  
    fund = startBalance - amount + growth;
  
    if (amount === startBalance) break; // final withdrawal year
  }
  

  // -----------------
  // Output results
  // -----------------
  let output = "<h2>Results</h2>";


  // Accumulation table

	output += "<h3>Accumulation Phase</h3>";
  output += "<table class='accumulation-table' border='1'><tr><th class='year'>Year</th><th class='age'>Age</th><th class='fund'>Fund (CI$)</th><th class='contribution'>Contribution (CI$)</th><th class='growth'>Growth (CI$)</th></tr>";
accumulation.forEach(row => {
	  output += `<tr>
    <td class="year centered">${row.year}</td>
    <td class="age centered">${row.age}</td>
    <td class="fund">${Number(row.fund).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td class="contribution">${Number(row.contribution).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td class="growth">${Number(row.growth).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
	  </tr>`;
	});
	output += "</table>";



  // Drawdown table
  
	output += "<h3>Drawdown Phase</h3>";
  output += "<table class='drawdown-table' border='1'><tr><th class='year'>Year</th><th class='age'>Age</th><th class='balance'>Balance at Start (CI$)</th><th class='percentage'>Max %</th><th class='drawdown'>Max Drawdown (CI$)</th><th class='growth'>Growth (CI$)</th></tr>";
  drawdown.forEach(row => {
    if (row.note) {
      output += `<tr class="drawdown-note"><td colspan="6">${row.note}</td></tr>`;
    } else {
      output += `<tr>
        <td class="year centered">${row.year}</td>
        <td class="age centered">${row.age}</td>
        <td class="balance">${Number(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="percentage">${row.percentage}</td>
        <td class="drawdown">${Number(row.drawdown).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="growth">${Number(row.growth).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>`;
    }
  });
  output += "</table>";

  const resultsDiv = document.getElementById('results');

    // Reset state
  resultsDiv.classList.remove('show');
  
  // Set HTML
  resultsDiv.innerHTML = output;
  
  // Allow browser to register the removal before adding again
  setTimeout(() => {
    resultsDiv.classList.add('show');
  }, 50);
  
  // Smooth scroll
  resultsDiv.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
  
  

});
