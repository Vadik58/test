function showError(id, message) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.style.display = "block";
    }
}

function clearErrors() {
    document.querySelectorAll(".error-message").forEach(el => {
        el.textContent = "";
        el.style.display = "none";
    });
}

function validate(amount, rate, years, months, depositsAdd, adjustRecurrent) {
    clearErrors();

    let valid = true;

    if (isNaN(amount)) {
        showError("amount-error", "Введите сумму");
        valid = false;
    }

    if (isNaN(rate) || rate < 0 || rate > 100) {
        showError("rate-error", "Введите процентную ставку от 0 до 100");
        valid = false;
    }

    if (isNaN(years) || years < 0 || years > 100) {
        showError("years-error", "Введите количество лет от 0 до 100");
        valid = false;
    }

    if (isNaN(months) || months < 0 || months > 11) {
        showError("months-error", "Введите количество месяцев от 0 до 11");
        valid = false;
    }

    if (!depositsAdd && adjustRecurrent) {
        showError("deposits-error", "Введите сумму пополнения");
        valid = false;
    }

    return valid;
}



// calculation.js
function calculationInvestment(amount, rate, years, months, frequency, recurrentData = null) {
    const interestRate = rate / 100;
    const totalMonths = years * 12 + months;
    const totalDays = Math.floor(totalMonths * 30.41666);
    let balance = amount;
    let invested = amount;

    const balances = [balance];
    const investedArr = [invested];
    const depositsTimeline = [];


    if (recurrentData && recurrentData.enabled && recurrentData.amount > 0) {
        const { type, amount: depositAmount } = recurrentData;

        if (type === "monthlyAdd") {

            for (let month = 1; month <= totalMonths; month++) {
                const day = Math.floor((month - 1) * 30.41666) + 1;
                depositsTimeline.push({ day: day, amount: depositAmount });
            }
        } else if (type === "yearlyAdd") {

            for (let year = 1; year <= years; year++) {
                const day = Math.floor((year - 1) * 12 * 30.41666) + 1;
                depositsTimeline.push({ day: day, amount: depositAmount });
            }
        } else if (type === "quarterlyAdd") {

            for (let quarter = 1; quarter <= Math.ceil(totalMonths / 3); quarter++) {
                const day = Math.floor((quarter - 1) * 3 * 30.41666) + 1;
                depositsTimeline.push({ day: day, amount: depositAmount });
            }
        }
    }

    if (frequency === "daily") {
        const dailyRate = interestRate / 365;
        for (let day = 1; day <= totalDays; day++) {

            const todayDeposits = depositsTimeline.filter(d => d.day === day);

            todayDeposits.forEach(deposit => {
                balance += deposit.amount;
                invested += deposit.amount;
            });

            balance *= 1 + dailyRate;
            balances.push(balance);
            investedArr.push(invested);
        }
    } else if (frequency === "monthly") {
        const monthlyRate = interestRate / 12;
        const daysPerMonth = 30.41666;

        for (let month = 1; month <= totalMonths; month++) {
            const startDay = Math.floor((month - 1) * daysPerMonth) + 1;
            const endDay = Math.floor(month * daysPerMonth);

            // Проверяем пополнения в этом месяце
            const monthDeposits = depositsTimeline.filter(d =>
                d.day >= startDay && d.day <= endDay
            );

            monthDeposits.forEach(deposit => {
                balance += deposit.amount;
                invested += deposit.amount;
            });

            balance *= 1 + monthlyRate;
            balances.push(balance);
            investedArr.push(invested);
        }
    } else if (frequency === "quarterly") {
        const quarterlyRate = interestRate / 4;
        const daysPerQuarter = 91.25;

        const totalQuarters = Math.ceil(totalMonths / 3);

        for (let quarter = 1; quarter <= totalQuarters; quarter++) {
            const startDay = Math.floor((quarter - 1) * daysPerQuarter) + 1;
            const endDay = Math.floor(quarter * daysPerQuarter);

            // Проверяем пополнения в этом квартале
            const quarterDeposits = depositsTimeline.filter(d =>
                d.day >= startDay && d.day <= endDay
            );

            quarterDeposits.forEach(deposit => {
                balance += deposit.amount;
                invested += deposit.amount;
            });

            balance *= 1 + quarterlyRate;
            balances.push(balance);
            investedArr.push(invested);
        }
    } else if (frequency === "yearly") {
        const daysPerYear = 365;

        for (let year = 1; year <= years; year++) {
            const startDay = (year - 1) * daysPerYear + 1;
            const endDay = year * daysPerYear;

            // Проверяем пополнения в этом году
            const yearDeposits = depositsTimeline.filter(d =>
                d.day >= startDay && d.day <= endDay
            );

            yearDeposits.forEach(deposit => {
                balance += deposit.amount;
                invested += deposit.amount;
            });

            balance *= 1 + interestRate;
            balances.push(balance);
            investedArr.push(invested);
        }
    } else {
        const totalYears = years + months / 12;
        balance *= (1 + interestRate * totalYears);
        balances.push(balance);
        investedArr.push(invested);
    }

    return {balances, investedArr};
}

function applyInflation(balances, inflationRate = 0.088, frequency, years, months, NDFL) {
    const totalYears = years + months / 12;
    const totalMonths = years * 12 + months;
    const totalQuarters = Math.ceil(totalMonths / 3);
    const totalDays = Math.floor(totalMonths * 30.41666);

    const finalAmount = balances.at(-1) - NDFL;
    let adjusted;

    if (frequency === "daily") {
        adjusted = finalAmount / Math.pow(1 + inflationRate, totalDays / 365);
    } else if (frequency === "monthly") {
        adjusted = finalAmount / Math.pow(1 + inflationRate, totalMonths / 12);
    } else if (frequency === "quarterly") {
        adjusted = finalAmount / Math.pow(1 + inflationRate, totalQuarters / 4);
    } else if (frequency === "yearly") {
        adjusted = finalAmount / Math.pow(1 + inflationRate, years);
    } else if (frequency === "once") {
        adjusted = finalAmount / Math.pow(1 + inflationRate, totalYears);
    }

    return adjusted;
}

function applyTax(balances, investedArr, frequency, years, months) {
    const taxBrackets = [
        { limit: 2_400_000, rate: 0.13 },
        { limit: 5_000_000, rate: 0.15 },
        { limit: 20_000_000, rate: 0.18 },
        { limit: 50_000_000, rate: 0.20 },
        { limit: Infinity, rate: 0.22 }
    ];

    const totalMonths = years * 12 + months;
    let monthlyProfits = [];

    if (frequency === "daily") {
        const daysPerMonth = 30.4166;
        for (let m = 1; m <= totalMonths; m++) {
            const dayIndex = Math.min(Math.floor(m * daysPerMonth), balances.length - 1);
            const prevDayIndex = Math.min(Math.floor((m - 1) * daysPerMonth), balances.length - 1);

            const profitMonth = (balances[dayIndex] - investedArr[dayIndex]) -
                (balances[prevDayIndex] - investedArr[prevDayIndex]);
            monthlyProfits.push(profitMonth);
        }
    } else if (frequency === "monthly") {
        for (let m = 1; m < balances.length; m++) {
            const profitMonth = (balances[m] - investedArr[m]) -
                (balances[m - 1] - investedArr[m - 1]);
            monthlyProfits.push(profitMonth);
        }
    } else if (frequency === "quarterly") {
        // Для квартального начисления распределяем прибыль по месяцам
        for (let q = 1; q < balances.length; q++) {
            const profitQuarter = (balances[q] - investedArr[q]) -
                (balances[q - 1] - investedArr[q - 1]);
            const profitMonth = profitQuarter / 3;
            for (let i = 0; i < 3; i++) monthlyProfits.push(profitMonth);
        }
    } else if (frequency === "yearly") {
        for (let y = 1; y < balances.length; y++) {
            const profitYear = (balances[y] - investedArr[y]) -
                (balances[y - 1] - investedArr[y - 1]);
            const profitMonth = profitYear / 12;
            for (let i = 0; i < 12; i++) monthlyProfits.push(profitMonth);
        }
    } else if (frequency === "once") {
        const totalProfit = balances[1] - investedArr[1];
        const profitMonth = totalProfit / totalMonths;
        for (let i = 0; i < totalMonths; i++) monthlyProfits.push(profitMonth);
    }

    let totalProfit = 0;
    let totalTax = 0;
    let yearProfit = 0;
    let yearTax = 0;

    for (let i = 0; i < monthlyProfits.length; i++) {
        yearProfit += monthlyProfits[i];
        totalProfit += monthlyProfits[i];

        let tempTax = 0;
        let prevLimit = 0;
        for (const bracket of taxBrackets) {
            if (yearProfit > bracket.limit) {
                tempTax += (bracket.limit - prevLimit) * bracket.rate;
                prevLimit = bracket.limit;
            } else {
                tempTax += (yearProfit - prevLimit) * bracket.rate;
                break;
            }
        }

        const taxThisMonth = tempTax - yearTax;
        yearTax = tempTax;
        totalTax += taxThisMonth;

        if ((i + 1) % 12 === 0) {
            yearProfit = 0;
            yearTax = 0;
        }
    }

    return totalTax;
}

function checkIsMobile() {
    return window.innerWidth < 600;
}

let lastEndInflation = null;
let lastBalances = null;
let lastInvestedArr = null;
let lastNDFL = null;
let lastAdjustInflation = null;
let lastAdjustTax = null;

let donutChart;
function createDonutChart(endInflation, balances, investedArr, NDFL, adjustInflation, adjustTax) {
    const donutEl = document.getElementById("donutChart");

    if (!donutChart) {
        donutChart = echarts.init(donutEl);
    }

    const finalBalance = balances.at(-1);
    const finalInvested = investedArr.at(-1);

    const realInflation = adjustInflation ? finalBalance - NDFL - endInflation : 0;
    const profit = adjustInflation ?
        finalBalance - finalInvested - realInflation - (adjustTax ? NDFL : 0) :
        finalBalance - finalInvested - (adjustTax ? NDFL : 0);

    const data = [
        { value: Math.round(finalInvested), name: 'Вложенные\n средства', itemStyle: { color: 'steelblue' } },
        { value: Math.round(profit), name: 'Доход', itemStyle: { color: 'seagreen' } }
    ];

    if (adjustInflation) {
        data.push({ value: Math.round(realInflation), name: 'Инфляция', itemStyle: { color: 'crimson' } });
    }

    if (adjustTax) {
        data.push({ value: Math.round(NDFL), name: 'НДФЛ', itemStyle: { color: 'orange' } });
    }

    const option = {
        title: checkIsMobile() ? { show: false } : {
            text: 'Структура итоговой суммы',
            left: 'center',
            top: 10,
            textStyle: {
                color: 'white',
                fontSize: 24,
                fontFamily: "Nunito",
                fontWeight: "lighter",
            }
        },
        tooltip: { trigger: 'item',
            formatter: function(params) {
                const formattedValue = formatResult(params.value);
                return `${params.name}: ${formattedValue} (${Math.round(params.percent)}%)`;
            },
            textStyle: {
                fontSize: checkIsMobile() ? 12 : 15,
            },
            confine: true,
            padding: checkIsMobile() ? 2 : 5,
            position: function (point, params, dom, rect, size) {
                let x = point[0];
                let y = point[1];

                const viewWidth = size.viewSize[0];
                const viewHeight = size.viewSize[1];
                const boxWidth = size.contentSize[0];
                const boxHeight = size.contentSize[1];

                if (x + boxWidth > viewWidth) {
                    x = viewWidth - boxWidth - 10;
                }

                if (y + boxHeight > viewHeight) {
                    y = viewHeight - boxHeight - 10;
                }

                return [x, y];
            }
            },
        series: [
            {
                type: 'pie',
                radius: checkIsMobile() ? ['25%', '50%'] : ['35%', '63%'],
                label: {
                    formatter: function (params) {
                        return `${params.name}\n${Math.round(params.percent)}%`;
                    },
                    fontSize: checkIsMobile() ? 13 : 16,
                    fontWeight: 'bold',
                    fontFamily: "Nunito",
                },
                data: data
            }
        ]
    };

    donutChart.setOption(option, true);
}

let chartInstance;
function createChart(chartLabels, investedArr, balances) {
    const chartEl = document.getElementById("profitChart");

    if (!chartInstance) {
        chartInstance = echarts.init(chartEl);
    }

    const option = {
        title: {
            text: "Рост инвестиций",
            top: 30,
            left: 10,
            textStyle: {
                color: "rgb(47, 79, 79)",
                fontSize: checkIsMobile() ? 16 : 24,
                fontFamily: "Nunito",
                fontWeight: "normal",
            }
        },
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(47,79,79,0.9)",
            textStyle: {
                color: "#fff",
                fontSize: checkIsMobile() ? 12 : 15,
                fontWeight: "lighter",
            },
            formatter: params => {
                let header = `<b>${params[0].axisValue}</b>`;

                let values = params.map(p =>
                    `<b>${p.seriesName}</b>: ${formatResult(p.value)} ₽`
                ).join("<br>");

                return header + "<br>" + values;
            },
            confine: true,
            padding: checkIsMobile() ? 2 : 5,
            position: function (point, params, dom, rect, size) {
                let x = point[0];
                let y = point[1];

                const viewWidth = size.viewSize[0];
                const viewHeight = size.viewSize[1];
                const boxWidth = size.contentSize[0];
                const boxHeight = size.contentSize[1];

                if (x + boxWidth > viewWidth) {
                    x = viewWidth - boxWidth - 10;
                }

                if (y + boxHeight > viewHeight) {
                    y = viewHeight - boxHeight - 10;
                }

                return [x, y];
            }
        },
        legend: {
            top: 5,
            textStyle: {
                fontSize: checkIsMobile() ? 12 : 16,
            },
        },
        grid: {
            left: 75,
            right: checkIsMobile() ? 20 : 40,
            top: 80,
            bottom: checkIsMobile() ? 40 : 80,
        },
        xAxis: {
            type: "category",
            data: chartLabels,
            axisLabel: { interval: "auto" },
        },
        yAxis: {
            type: "value",
            axisLabel: {
                formatter: function (value) {
                    if (value >= 1_000_000_000) {
                        return value.toExponential(2);
                    }
                    return value.toString();
                }
            },
        },
        dataZoom: checkIsMobile() ? [
            { type: "inside" }] :
            [ { type: "inside" },
                {
                type: "slider",
                left: 70,
                right: 90,
                bottom: 20,
            },
        ],
        toolbox: {
            feature: {
                saveAsImage: { title: "Скачать" },
                restore: {},
            },
            right: 10,
            top: 25,
        },
        series: [
            {
                name: "Вложенные средства",
                type: "line",
                smooth: true,
                showSymbol: false,
                data: investedArr,
                lineStyle: { color: "#4E79A7", width: 2 },
                itemStyle: { color: "#4E79A7" },
                emphasis: { focus: "none" },
            },
            {
                name: "Сумма на счете",
                type: "line",
                smooth: true,
                showSymbol: false,
                data: balances,
                lineStyle: { color: "#59A14F", width: 3 },
                itemStyle: { color: "#59A14F" },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: "rgba(89, 161, 79, 0.6)" },
                        { offset: 1, color: "rgba(89, 161, 79, 0)" }
                    ])
                },
                emphasis: { focus: "none" }
            }
        ],
        animationDuration: 1500,
        animationEasing: 'cubicOut'
    };

    chartInstance.setOption(option, true);
}


// excel.js
function createExcel(chartLabels, investedArr, balances) {
    const table = [
        ["Период", "Начальная сумма", "Конечная сумма"],
    ];

    chartLabels.slice(1).forEach((label, i) => {
        const row = [
            label,
            investedArr[i + 1],
            balances[i + 1],
        ];
        table.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(table);
    worksheet['!cols'] = [
        { wch: 15 },
        { wch: 18 },
        { wch: 18 }
    ];

    for (let col = 0; col < 3; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
                font: { bold: true },
                alignment: { horizontal: 'center' }
            };
        }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Инвестиции");
    XLSX.writeFile(workbook, "investments.xlsx");
}

function outputData(frequency, balances) {
    let chartLabels;

    if(frequency === "daily") {
        chartLabels = balances.map((_, i) => `День ${i}`);
    } else if (frequency === "monthly") {
        chartLabels = balances.map((_, i) => `Месяц ${i}`);
    } else if (frequency === "quarterly") {
        chartLabels = balances.map((_, i) => `Квартал ${i}`);
    } else if (frequency === "yearly") {
        chartLabels = balances.map((_, i) => `Год ${i}`);
    } else if (frequency === "once") {
        chartLabels = ["Начало", "Конец"];
    }

    return chartLabels;
}

function formatResult(value) {
    value = Math.round(value);

    if (value >= 1_000_000_000_000) {
        return value.toExponential(2);
    }
    return value.toLocaleString("ru-RU");
}



function runCalculation() {

    const amount = +window.amountMask.unmaskedValue;
    const rate = parseFloat(document.getElementById("rate").value);
    const years = parseInt(document.getElementById("years").value);
    const months = parseInt(document.getElementById("months").value);
    const frequency = document.getElementById("frequency").value;

    const totalMonths = years * 12 + months;
    const totalDays = Math.floor(totalMonths * 30.41666);

    const adjustInflation = document.getElementById("adjustInflation").checked;
    const adjustTax = document.getElementById("adjustTax").checked;
    const adjustRecurrent = document.getElementById("adjustmentRecurrent").checked;

    const depositAmount = +window.recurrentMask.unmaskedValue || 0;

    let recurrentData = null;
    if (adjustRecurrent) {
        const depositType = document.getElementById("deposits").value;

        recurrentData = {
            enabled: true,
            type: depositType,
            amount: depositAmount
        };
    }

    if (!validate(amount, rate, years, months, depositAmount, adjustRecurrent)) {
        return;
    }

    const {balances, investedArr} = calculationInvestment(
        amount, rate, years, months, frequency, recurrentData
    );

    const chartLabels = outputData(frequency, balances, totalMonths, totalDays);

    const NDFL = adjustTax ? applyTax(balances, investedArr, frequency, years, months) : 0;
    const inflationRate = 0.088;
    const endInflation = adjustInflation ?
        applyInflation(balances, inflationRate, frequency, years, months, NDFL) :
        balances.at(-1) - NDFL;

    const resultsEl = document.getElementById("result");

    let resultHTML = `
    <p class="text-result"><b>Начальная сумма:</b><br> ${formatResult(amount)} ₽</p>`;
    if (adjustRecurrent) {
        resultHTML += `<p class="text-result"><b>Сумма пополнений:</b><br> ${formatResult(investedArr.at(-1) - amount)} ₽</p>`;
    }
    resultHTML += `<p class="text-result"><b>Потенциальная прибыль:</b><br> ${formatResult(balances.at(-1) - investedArr.at(-1))} ₽</p>`;
    if (adjustTax) {
        resultHTML += `<p class="text-result"><b>Налог:</b><br> -${formatResult(NDFL)} ₽</p>`;
    }
    if (adjustInflation) {
        resultHTML += `<p class="text-result"><b>Инфляция:</b><br> ${formatResult(balances.at(-1) - endInflation - NDFL)} ₽<br>
                      <span class="additionalInflation">
                      Сумма с учётом инфляции: ${formatResult(endInflation)} ₽</span></p>`;
    }

    resultHTML += `<p class="final-sum text-result"><b>Итоговая сумма:</b><br> ${formatResult(balances.at(-1) - NDFL)} ₽</p>`;

    resultsEl.innerHTML = resultHTML;

    document.querySelector('.chart').style.display = 'block';
    document.querySelector('.calculator__result-wrapper').classList.add('show');

    lastEndInflation = endInflation;
    lastBalances = balances;
    lastInvestedArr = investedArr;
    lastNDFL = NDFL;
    lastAdjustInflation = adjustInflation;
    lastAdjustTax = adjustTax;

    createChart(chartLabels, investedArr, balances);
    createDonutChart(endInflation, balances, investedArr, NDFL, adjustInflation, adjustTax);

    document.getElementById("exportExcel").onclick = () => {
        createExcel(chartLabels, investedArr, balances);
    };
}


document.addEventListener("DOMContentLoaded", function () {
    const frequencySelect = document.getElementById("frequency");
    const depositsAddOption = document.getElementById("deposits");
    const depositsAddInput = document.getElementById("depositsAdd");
    const recurrentCheckbox = document.getElementById("adjustmentRecurrent");
    const monthsAdd = document.getElementById("months");

    const inputAmount = document.getElementById("amount");

    window.amountMask = IMask(inputAmount, {
        mask: Number,
        min: 0,
        max: 1000000000000,
        thousandsSeparator: " ",
    });

    const inputRecurrent = document.getElementById("depositsAdd");

    window.recurrentMask = IMask(inputRecurrent, {
        mask: Number,
        min: 1,
        max: 1000000000000,
        thousandsSeparator: " ",
    });

    const updateDepositAddState = () => {
        if (frequencySelect.value === "once") {
            recurrentCheckbox.checked = false;
            recurrentCheckbox.disabled = true;
            depositsAddOption.disabled = true;
            depositsAddInput.disabled = true;
            depositsAddInput.value = "";
        } else {
            recurrentCheckbox.disabled = false;
            depositsAddOption.disabled = !recurrentCheckbox.checked;
            depositsAddInput.disabled = !recurrentCheckbox.checked;
            depositsAddInput.value = "";
        }
    };

    frequencySelect.addEventListener("change", updateDepositAddState);
    recurrentCheckbox.addEventListener("change", updateDepositAddState);
    updateDepositAddState();

    const absenceOfMonths = () => {
        if (frequencySelect.value === "yearly" || frequencySelect.value === "quarterly") {
            monthsAdd.disabled = true;
            monthsAdd.value = 0;
        } else {
            monthsAdd.disabled = false;
        }
    };

    frequencySelect.addEventListener("change", absenceOfMonths);
    absenceOfMonths();

    document.getElementById("calculateBtn").addEventListener("click", function (e) {
        e.preventDefault();
        runCalculation();
    });

    document.getElementById("calc-form").addEventListener("submit", function (e) {
        e.preventDefault();
        runCalculation();
    });

    function debounce(fn, ms = 50) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    }

    function safeResize() {
        if (chartInstance) {
            chartInstance.resize();
        }
        if (donutChart) {
            donutChart.resize();
        }
    }

    function safeRecreateDonut() {
        if (donutChart && lastBalances) {
            donutChart.dispose();
            donutChart = null;
            createDonutChart(
                lastEndInflation,
                lastBalances,
                lastInvestedArr,
                lastNDFL,
                lastAdjustInflation,
                lastAdjustTax
            );
        }
    }

    window.addEventListener("resize", debounce(safeResize, 120));
    window.addEventListener("orientationchange", debounce(safeRecreateDonut, 220));


    document.querySelectorAll(".help").forEach((el) => {
        el.addEventListener("click", function (e) {
            e.stopPropagation();
            if (this.classList.contains("active")) {
                this.classList.remove("active");
            } else {
                document.querySelectorAll(".help.active").forEach((h) => h.classList.remove("active"));
                this.classList.add("active");
            }
        });
    });

    document.addEventListener("click", () => {
        document.querySelectorAll(".help.active").forEach((h) => h.classList.remove("active"));
    });
});



