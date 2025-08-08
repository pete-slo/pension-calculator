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

function addCustomStepSpinner(input, stepSize) {
  input.addEventListener('keydown', function (e) {
    const current = parseFloat(this.value) || 0;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.value = current + stepSize;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.value = Math.max(current - stepSize, 0);
    }
  });

  // Spinner click fallback (some browsers fire input instead of keydown)
  input.addEventListener('wheel', function (e) {
    if (document.activeElement === this) {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      const current = parseFloat(this.value) || 0;
      this.value = delta < 0
        ? current + stepSize
        : Math.max(current - stepSize, 0);
    }
  });
}

// Apply to fields
addCustomStepSpinner(document.getElementById('fund'), 10000);
addCustomStepSpinner(document.getElementById('contribution'), 1000);




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
  const inflationRate = parseFloat(document.getElementById('inflation').value) / 100;

  const currentYear = new Date().getFullYear();
  const yearsUntilRetirement = retirementAge - age;


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

  const BASE_MINIMUM = 15400;
	let drawdown = [];



  let inflationMultiplier = Math.pow(1 + inflationRate, yearsUntilRetirement);

  for (let yr = retirementAge; yr < lifeExpectancy; yr++) {
    const rules = drawdownTable[yr];
    if (!rules) break;
    if (fund <= 0) break;

    const startBalance = fund;
    const pctAmount = startBalance * rules.percentage;

    // Apply inflation to minimum
    let adjustedMinimum = BASE_MINIMUM * inflationMultiplier;
    inflationMultiplier *= (1 + inflationRate); // compound yearly

    let amount = Math.max(pctAmount, adjustedMinimum);
    let usedMinimum = amount === adjustedMinimum;

    let growth = roi * (startBalance - (amount / 2));
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
      growth: growth.toFixed(2),
      usedMinimum: usedMinimum  // track this for display
    });

    if (yr === 89 && fund > 0) {
      drawdown.push({
        note: "At age 89, you may take the remaining balance as a lump sum."
      });
    }

    fund = startBalance - amount + growth;
    if (amount === startBalance) break;
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
  
  let guidanceMessage = "";
  let guidanceClass = "";
  
  const drawdownAt85 = drawdown.find(row => row.age === 85);
  
  if (!drawdownAt85) {
    guidanceClass = "alert";
    guidanceMessage = "❌ Oh dear. The projection suggests your funds may run out too soon. Consider saving more, or planning to retire later.";
  } else {
    const remainingAt85 = parseFloat(drawdownAt85.balance);
    if (remainingAt85 > 50000) {
      guidanceClass = "good";
      guidanceMessage = "✅ Looking good! In your mid-eighties, the projection indicates that you may still have pension funds available for several years to come.";
    } else {
      guidanceClass = "warning";
      guidanceMessage = "⚠️ Be careful. The projection shows that your pension plan may be depleted by your mid-eighties.";
    }
  }
  

	output += "<h3>Drawdown Phase</h3>";
  output += "<table class='drawdown-table' border='1'><tr><th class='year'>Year</th><th class='age'>Age</th><th class='balance'>Balance at Start (CI$)</th><th class='percentage' title='The maximum percentage of your pension fund that may be withdrawn at the age you reach this year.'>Max %</th><th class='drawdown' title='The percentage of your pension fund, or the minimum annual amount ($15,400), whichever is greater.'>Annual Max (CI$)</th><th class='growth'>Growth (CI$)</th></tr>";
  drawdown.forEach(row => {
    if (row.note) {
      output += `<tr class="drawdown-note"><td colspan="6">${row.note}</td></tr>`;
    } else {
      const rowClass = row.usedMinimum ? 'min-used' : '';
      output += `<tr class="${rowClass}">
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

  output += `
  <p style="font-size: 0.9em; margin-top: -10px; max-width: 600px;">
    <span class="legend-swatch min-used"></span>
    Indicates the minimum withdrawal was applied, because the percentage of your remaining fund did not meet the minimum.
  </p>

`;


  output += `<div class="guidance ${guidanceClass}">${guidanceMessage}</div>`;

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


// Load and show ROI options

document.getElementById('select-roi').addEventListener('click', async () => {
  const modal = document.getElementById('roiModal');
  const list = document.getElementById('roiOptions');
  list.innerHTML = '';

  const response = await fetch('pension-returns.csv');
  const text = await response.text();
  const rows = text.trim().split('\n');
  const headers = rows[0].split(',').map(h => h.trim()); // ["description", "5yr", "10yr"]
  const dataRows = rows.slice(1);

  const plans = dataRows.map(row => {
    const cols = row.split(',').map(v => v.trim());
    return {
      description: cols[0],
      '5yr': parseFloat(cols[1]),
      '10yr': parseFloat(cols[2])
    };
  });

  function renderList(duration) {
    list.innerHTML = ''; // Clear previous
    plans.forEach(plan => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${plan.description}</span><strong>${plan[duration]}%</strong>`;
      li.addEventListener('click', () => {
        document.getElementById('roi').value = plan[duration];
        modal.style.display = 'none';
      });
      list.appendChild(li);
    });
  }

  // Initial render with default (5yr)
  renderList('5yr');
  modal.style.display = 'block';

  // Listen for duration toggle
  document.querySelectorAll('input[name="roi-duration"]').forEach(radio => {
    radio.addEventListener('change', () => {
      renderList(radio.value);
    });
  });
});

// Close modal on X click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('roiModal');
  const isCloseButton = e.target.classList.contains('close-modal');
  const isOutside = e.target === modal;

  if (isCloseButton || isOutside) {
    modal.style.display = 'none';
  }
});


