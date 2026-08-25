let laborData = [];

let drillLevel = "region";

let drillContext = {
    region: null,
    circle: null,
    city: null
};


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        document
            .getElementById("resetFilters")
            .addEventListener(
                "click",
                resetFilters
            );

        document
            .getElementById("drillBack")
            .addEventListener(
                "click",
                drillBack
            );

        await loadLaborCost();

    }
);


/* =========================
   LOAD DATA
========================= */

async function loadLaborCost() {

    try {

        const response =
            await fetch("/api/labor-cost");

        if (!response.ok) {

            throw new Error(
                "Unable to load Labor Cost data."
            );

        }

        const result =
            await response.json();

        laborData =
            result.data || [];

        populateFilters();

        renderDashboard();

    }

    catch (error) {

        console.error(error);

        document
            .getElementById("laborTableBody")
            .innerHTML = `
                <tr>
                    <td colspan="13">
                        ${error.message}
                    </td>
                </tr>
            `;

    }

}


/* =========================
   FILTERS
========================= */

function populateFilters() {

    fillSelect(
        "monthFilter",
        uniqueValues("month")
    );

    fillSelect(
        "regionFilter",
        uniqueValues("region")
    );

    fillSelect(
        "circleFilter",
        uniqueValues("circle")
    );

    fillSelect(
        "cityFilter",
        uniqueValues("city")
    );

    fillSelect(
        "storeFilter",
        uniqueValues("storecode")
    );


    [
        "monthFilter",
        "regionFilter",
        "circleFilter",
        "cityFilter",
        "storeFilter"

    ].forEach(id => {

        document
            .getElementById(id)
            .addEventListener(
                "change",
                renderDashboard
            );

    });

}


function uniqueValues(field) {

    return [
        ...new Set(
            laborData
                .map(x => x[field])
                .filter(Boolean)
        )
    ].sort();

}


function fillSelect(id, values) {

    const select =
        document.getElementById(id);

    values.forEach(value => {

        const option =
            document.createElement("option");

        option.value = value;
        option.textContent = value;

        select.appendChild(option);

    });

}


function getFilteredData() {

    const month =
        document
            .getElementById("monthFilter")
            .value;

    const region =
        document
            .getElementById("regionFilter")
            .value;

    const circle =
        document
            .getElementById("circleFilter")
            .value;

    const city =
        document
            .getElementById("cityFilter")
            .value;

    const store =
        document
            .getElementById("storeFilter")
            .value;


    return laborData.filter(row => {

        return (
            (!month || row.month === month) &&
            (!region || row.region === region) &&
            (!circle || row.circle === circle) &&
            (!city || row.city === city) &&
            (!store || row.storecode === store)
        );

    });

}


function resetFilters() {

    document
        .querySelectorAll(
            ".filter-panel select"
        )
        .forEach(x => x.value = "");

    drillLevel = "region";

    drillContext = {
        region: null,
        circle: null,
        city: null
    };

    renderDashboard();

}


/* =========================
   DASHBOARD
========================= */

function renderDashboard() {

    const data =
        getFilteredData();

    renderKPIs(data);

    renderDrillTable(data);

}


/* =========================
   KPIs
========================= */

function renderKPIs(data) {

    const actualSales =
        sum(data, "actual_sales");

    const aopSales =
        sum(data, "aop_sales");

    const actualLC =
        sum(data, "actual_lc");

    const aopLC =
        sum(data, "aop_lc");

    const storeDays =
        sum(data, "store_days");

    const idealFTE =
        sum(data, "ideal_fte");

    const actualFTE =
        sum(data, "actual_fte");


    const actualADS =
        storeDays
            ? actualSales / storeDays
            : 0;

    const aopADS =
        sum(data, "aop_ads");

    const actualLCP =
        actualSales
            ? actualLC / actualSales
            : 0;

    const aopLCP =
        aopSales
            ? aopLC / aopSales
            : 0;


    setText(
        "actualSales",
        money(actualSales)
    );

    setText(
        "aopSales",
        money(aopSales)
    );

    setText(
        "actualADS",
        money(actualADS)
    );

    setText(
        "aopADS",
        money(aopADS)
    );

    setText(
        "actualLC",
        money(actualLC)
    );

    setText(
        "aopLC",
        money(aopLC)
    );

    setText(
        "actualLCP",
        percent(actualLCP)
    );

    setText(
        "aopLCP",
        percent(aopLCP)
    );

    setText(
        "idealFTE",
        number(idealFTE)
    );

    setText(
        "actualFTE",
        number(actualFTE)
    );

    setText(
        "fteGap",
        number(
            actualFTE - idealFTE
        )
    );

    setText(
        "lcVariance",
        money(
            actualLC - aopLC
        )
    );

}


/* =========================
   DRILL DOWN
========================= */

function renderDrillTable(data) {

    let workingData = data;


    if (drillContext.region) {

        workingData =
            workingData.filter(
                x =>
                    x.region ===
                    drillContext.region
            );

    }


    if (drillContext.circle) {

        workingData =
            workingData.filter(
                x =>
                    x.circle ===
                    drillContext.circle
            );

    }


    if (drillContext.city) {

        workingData =
            workingData.filter(
                x =>
                    x.city ===
                    drillContext.city
            );

    }


    const fieldMap = {

        region: "region",

        circle: "circle",

        city: "city",

        store: "storecode"

    };


    const field =
        fieldMap[drillLevel];


    document
        .getElementById("levelHeading")
        .textContent =
            drillLevel
                .charAt(0)
                .toUpperCase()
            +
            drillLevel.slice(1);


    const groups =
        groupBy(
            workingData,
            field
        );


    const tbody =
        document
            .getElementById(
                "laborTableBody"
            );


    tbody.innerHTML = "";


    Object.keys(groups)
        .sort()
        .forEach(name => {

            const rows =
                groups[name];

            const actualSales =
                sum(rows, "actual_sales");

            const aopSales =
                sum(rows, "aop_sales");

            const actualLC =
                sum(rows, "actual_lc");

            const aopLC =
                sum(rows, "aop_lc");

            const days =
                sum(rows, "store_days");

            const ideal =
                sum(rows, "ideal_fte");

            const actual =
                sum(rows, "actual_fte");


            const actualADS =
                days
                    ? actualSales / days
                    : 0;

            const actualLCP =
                actualSales
                    ? actualLC / actualSales
                    : 0;

            const aopLCP =
                aopSales
                    ? aopLC / aopSales
                    : 0;


            const tr =
                document.createElement("tr");


            tr.innerHTML = `

                <td>
                    <span
                        class="drill-link"
                        data-name="${escapeHTML(name)}"
                    >
                        ${escapeHTML(name)}
                    </span>
                </td>

                <td>
                    ${
                        new Set(
                            rows.map(
                                x => x.storecode
                            )
                        ).size
                    }
                </td>

                <td>
                    ${money(actualSales)}
                </td>

                <td>
                    ${money(aopSales)}
                </td>

                <td>
                    ${money(actualADS)}
                </td>

                <td>
                    ${money(sum(rows,"aop_ads"))}
                </td>

                <td>
                    ${money(actualLC)}
                </td>

                <td>
                    ${money(aopLC)}
                </td>

                <td>
                    ${percent(actualLCP)}
                </td>

                <td>
                    ${percent(aopLCP)}
                </td>

                <td>
                    ${number(ideal)}
                </td>

                <td>
                    ${number(actual)}
                </td>

                <td class="${
                    actual - ideal < 0
                        ? "negative"
                        : "positive"
                }">
                    ${number(actual - ideal)}
                </td>

            `;


            tr
                .querySelector(
                    ".drill-link"
                )
                .addEventListener(
                    "click",
                    () =>
                        drillInto(
                            name,
                            rows
                        )
                );


            tbody.appendChild(tr);

        });


    updateBreadcrumb();

}


/* =========================
   DRILL ACTION
========================= */

function drillInto(name, rows) {

    if (drillLevel === "region") {

        drillContext.region =
            name;

        drillLevel =
            "circle";

    }

    else if (
        drillLevel === "circle"
    ) {

        drillContext.circle =
            name;

        drillLevel =
            "city";

    }

    else if (
        drillLevel === "city"
    ) {

        drillContext.city =
            name;

        drillLevel =
            "store";

    }

    else {

        showStoreDetail(
            rows[0]
        );

        return;

    }


    renderDashboard();

}


/* =========================
   DRILL BACK
========================= */

function drillBack() {

    document
        .getElementById(
            "storeDetailPanel"
        )
        .style.display =
            "none";


    if (drillLevel === "store") {

        drillLevel =
            "city";

        drillContext.city =
            null;

    }

    else if (
        drillLevel === "city"
    ) {

        drillLevel =
            "circle";

        drillContext.circle =
            null;

    }

    else if (
        drillLevel === "circle"
    ) {

        drillLevel =
            "region";

        drillContext.region =
            null;

    }


    renderDashboard();

}


/* =========================
   STORE DETAIL
========================= */

function showStoreDetail(row) {

    const panel =
        document.getElementById(
            "storeDetailPanel"
        );

    panel.style.display =
        "block";


    setText(
        "selectedStoreName",
        `${row.storecode} - ${row.store_name || ""}`
    );

    setText(
        "storeADSBand",
        row.ads_band || "-"
    );

    setText(
        "storeDays",
        number(row.store_days)
    );

    setText(
        "fixedLC",
        money(row.fixed_lc)
    );

    setText(
        "variableLC",
        money(row.variable_lc)
    );

    setText(
        "fnfAdjustment",
        money(row.fnf_adjustment)
    );

    setText(
        "salesPerFTE",
        money(
            row.actual_fte
                ?
                row.actual_sales /
                row.actual_fte
                :
                0
        )
    );


    const roles = [

        ["SM","ideal_sm","actual_sm"],

        ["ARM","ideal_arm","actual_arm"],

        ["RM","ideal_rm","actual_rm"],

        ["SA","ideal_sa","actual_sa"],

        [
            "SA Exp",
            "ideal_sa_exp",
            "actual_sa_exp"
        ],

        [
            "SA Pro",
            "ideal_sa_pro",
            "actual_sa_pro"
        ]

    ];


    const tbody =
        document.getElementById(
            "fteDetailBody"
        );


    tbody.innerHTML = "";


    roles.forEach(role => {

        const ideal =
            Number(
                row[role[1]] || 0
            );

        const actual =
            Number(
                row[role[2]] || 0
            );

        const gap =
            actual - ideal;


        tbody.innerHTML += `

            <tr>

                <td>
                    ${role[0]}
                </td>

                <td>
                    ${number(ideal)}
                </td>

                <td>
                    ${number(actual)}
                </td>

                <td class="${
                    gap < 0
                        ? "negative"
                        : "positive"
                }">
                    ${number(gap)}
                </td>

            </tr>

        `;

    });


    panel.scrollIntoView({
        behavior: "smooth"
    });

}


/* =========================
   BREADCRUMB
========================= */

function updateBreadcrumb() {

    const parts =
        ["All India"];

    if (drillContext.region)
        parts.push(
            drillContext.region
        );

    if (drillContext.circle)
        parts.push(
            drillContext.circle
        );

    if (drillContext.city)
        parts.push(
            drillContext.city
        );


    document
        .getElementById(
            "breadcrumb"
        )
        .textContent =
            parts.join(" → ");

}


/* =========================
   HELPERS
========================= */

function sum(data, field) {

    return data.reduce(
        (total,row) =>
            total +
            Number(
                row[field] || 0
            ),
        0
    );

}


function groupBy(data, field) {

    return data.reduce(
        (result,row) => {

            const key =
                row[field] ||
                "Unknown";

            if (!result[key]) {
                result[key] = [];
            }

            result[key].push(row);

            return result;

        },
        {}
    );

}


function money(value) {

    return "₹" +
        Number(value || 0)
            .toLocaleString(
                "en-IN",
                {
                    maximumFractionDigits: 0
                }
            );

}


function number(value) {

    return Number(value || 0)
        .toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        );

}


function percent(value) {

    return (
        Number(value || 0) * 100
    ).toFixed(1) + "%";

}


function setText(id,value) {

    document
        .getElementById(id)
        .textContent = value;

}


function escapeHTML(value) {

    return String(value || "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

}
