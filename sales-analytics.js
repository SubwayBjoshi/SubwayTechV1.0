
const STATE = {

    stores: [],

    channels: [],

    selectedPeriod:
        "MTD"

};


function $(id) {

    return document.getElementById(id);

}


function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function unique(values) {

    return [

        ...new Set(

            values
                .map(clean)
                .filter(Boolean)

        )

    ].sort(
        (a,b) =>
            a.localeCompare(b)
    );

}


async function getJson(url) {

    const response =
        await fetch(url);


    const text =
        await response.text();


    if (!response.ok) {

        throw new Error(
            `API ${response.status}: ${text}`
        );

    }


    if (!text) {

        throw new Error(
            "API returned empty response"
        );

    }


    try {

        return JSON.parse(text);

    } catch {

        throw new Error(
            "API returned invalid JSON"
        );

    }

}


function fillSelect(
    id,
    values,
    allText
) {

    const element =
        $(id);


    if (!element) {

        return;

    }


    const previous =
        element.value;


    element.innerHTML =
        `<option value="">${allText}</option>`;


    values.forEach(value => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            value;

        option.textContent =
            value;


        element.appendChild(
            option
        );

    });


    if (
        values.includes(previous)
    ) {

        element.value =
            previous;

    }

}


async function loadMasters() {

    try {

        clearError();


        const [
            storesResult,
            channelsResult
        ] = await Promise.all([

            getJson(
                "/api/redash?dataset=storeMaster"
            ),

            getJson(
                "/api/redash?dataset=channel"
            )

        ]);


        STATE.stores =
            storesResult.rows || [];

        STATE.channels =
            channelsResult.rows || [];


        populateStoreFilters();

        populateChannelFilters();


    } catch (error) {

        showError(
            error.message
        );

    }

}


function storeCode(row) {

    return clean(

        row.Store_Code

        ||

        row.storecode

        ||

        row["Store Code"]

    );

}


function populateStoreFilters() {

    fillSelect(
        "region",
        unique(
            STATE.stores.map(
                row => row.Region
            )
        ),
        "All Regions"
    );


    fillSelect(
        "circle",
        unique(
            STATE.stores.map(
                row => row.Circle
            )
        ),
        "All Circles"
    );


    fillSelect(
        "city",
        unique(
            STATE.stores.map(
                row => row.City
            )
        ),
        "All Cities"
    );


    fillSelect(
        "type",
        unique(
            STATE.stores.map(
                row => row.Type
            )
        ),
        "All Types"
    );


    fillSelect(
        "format",
        unique(
            STATE.stores.map(
                row => row.Format
            )
        ),
        "All Formats"
    );


    fillSelect(
        "cohort",
        unique(
            STATE.stores.map(
                row => row.Cohort
            )
        ),
        "All Cohorts"
    );


    fillSelect(
        "statusFilter",
        unique(
            STATE.stores.map(
                row => row.Status
            )
        ),
        "All Status"
    );


    fillSelect(
        "areaManager",
        unique(
            STATE.stores.map(
                row =>
                    row.Area_Manager
                    ||
                    row["Area Manager"]
            )
        ),
        "All Area Managers"
    );


    fillSelect(
        "store",
        unique(
            STATE.stores.map(
                storeCode
            )
        ),
        "All Stores"
    );

}


function mainSource(row) {

    return clean(

        row.MainSource

        ||

        row.mainsource

        ||

        row["Main Source"]

    );

}


function channelName(row) {

    return clean(

        row.Channel

        ||

        row.channel

    );

}


function sourceName(row) {

    return clean(

        row.Source

        ||

        row.source

    );

}


function populateChannelFilters() {

    fillSelect(

        "mainSource",

        unique(
            STATE.channels.map(
                mainSource
            )
        ),

        "All Main Sources"

    );


    refreshChannelHierarchy();

}


function refreshChannelHierarchy() {

    const selectedMain =
        clean(
            $("mainSource").value
        );


    const selectedChannel =
        clean(
            $("channel").value
        );


    let rows =
        STATE.channels;


    if (selectedMain) {

        rows =
            rows.filter(
                row =>
                    mainSource(row)
                    === selectedMain
            );

    }


    const channels =
        unique(
            rows.map(
                channelName
            )
        );


    fillSelect(
        "channel",
        channels,
        "All Channels"
    );


    const currentChannel =
        clean(
            $("channel").value
        );


    if (currentChannel) {

        rows =
            rows.filter(
                row =>
                    channelName(row)
                    === currentChannel
            );

    }


    fillSelect(

        "source",

        unique(
            rows.map(
                sourceName
            )
        ),

        "All Sources"

    );

}


function setPeriod(period) {

    STATE.selectedPeriod =
        period;


    document
        .querySelectorAll(
            "[data-period]"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.period
                === period
            );

        });


    const range =
        getPeriodRange(
            period
        );


    $("fromDate").value =
        range.startDate;

    $("toDate").value =
        range.endDate;


    loadSummary();

}


function getPeriodRange(period) {

    const today =
        new Date();


    const end =
        new Date(today);


    let start =
        new Date(today);


    if (period === "FTD") {

        start =
            new Date(today);

    }


    if (period === "WTD") {

        const day =
            today.getDay();

        const mondayOffset =
            day === 0
                ? -6
                : 1 - day;


        start.setDate(
            today.getDate()
            + mondayOffset
        );

    }


    if (period === "MTD") {

        start =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

    }


    if (period === "YTD") {

        const year =
            today.getMonth() >= 3
                ? today.getFullYear()
                : today.getFullYear() - 1;


        start =
            new Date(
                year,
                3,
                1
            );

    }


    if (period === "LAST7") {

        start =
            new Date(today);

        start.setDate(
            today.getDate() - 6
        );

    }


    if (period === "LAST30") {

        start =
            new Date(today);

        start.setDate(
            today.getDate() - 29
        );

    }


    return {

        startDate:
            formatDate(start),

        endDate:
            formatDate(end)

    };

}


function formatDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


async function loadSummary() {

    try {

        clearError();


        const startDate =
            $("fromDate").value;

        const endDate =
            $("toDate").value;


        if (
            !startDate ||
            !endDate
        ) {

            throw new Error(
                "Please select From and To dates."
            );

        }


        setLoading(
            true
        );


        const params =
            new URLSearchParams({

                startDate,
                endDate

            });


        const result =
            await getJson(
                `/api/sales-summary?${params}`
            );


        renderSummary(
            result.summary
        );


    } catch (error) {

        showError(
            error.message
        );


    } finally {

        setLoading(
            false
        );

    }

}


function renderSummary(summary) {

    $("revenue").textContent =
        currency(
            summary.revenue
        );


    $("bills").textContent =
        numberFormat(
            summary.bills
        );


    $("discount").textContent =
        currency(
            summary.discount
        );


    $("discountPct").textContent =
        `${Number(
            summary.discountPct || 0
        ).toFixed(2)}%`;


    $("storeDays").textContent =
        numberFormat(
            summary.storeDays
        );


    $("ads").textContent =
        currency(
            summary.ads
        );


    $("adt").textContent =
        numberFormat(
            summary.adt
        );


    $("apc").textContent =
        currency(
            summary.apc
        );

}


function currency(value) {

    return new Intl.NumberFormat(

        "en-IN",

        {

            style:
                "currency",

            currency:
                "INR",

            maximumFractionDigits:
                0

        }

    ).format(
        Number(value || 0)
    );

}


function numberFormat(value) {

    return new Intl.NumberFormat(

        "en-IN",

        {

            maximumFractionDigits:
                0

        }

    ).format(
        Number(value || 0)
    );

}


function resetFilters() {

    document
        .querySelectorAll(
            "select"
        )
        .forEach(select => {

            select.value =
                "";

        });


    setPeriod(
        "MTD"
    );

}


function setLoading(value) {

    $("kpiSection")
        .classList
        .toggle(
            "loading",
            value
        );

}


function showError(message) {

    $("error").textContent =
        message;

}


function clearError() {

    $("error").textContent =
        "";

}


function registerEvents() {

    document
        .querySelectorAll(
            "[data-period]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    setPeriod(
                        button.dataset.period
                    )
            );

        });


    $("applyBtn")
        .addEventListener(
            "click",
            loadSummary
        );


    $("resetBtn")
        .addEventListener(
            "click",
            resetFilters
        );


    $("mainSource")
        .addEventListener(
            "change",
            () => {

                $("channel").value =
                    "";

                $("source").value =
                    "";

                refreshChannelHierarchy();

            }
        );


    $("channel")
        .addEventListener(
            "change",
            () => {

                $("source").value =
                    "";

                refreshChannelHierarchy();

            }
        );

}


document.addEventListener(

    "DOMContentLoaded",

    async () => {

        registerEvents();

        await loadMasters();

        setPeriod(
            "MTD"
        );

    }

);
