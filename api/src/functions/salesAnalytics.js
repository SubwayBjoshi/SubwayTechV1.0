
const { app } = require("@azure/functions");

/* =========================================================
   SALES ANALYTICS API
   Route:
   /api/sales-analytics

   Redash Queries:
   80 = Store Master
   86 = Sales
   87 = Store Days
   88 = Channel
   89 = Sales Summary
   ========================================================= */

app.http("salesAnalytics", {

    methods: ["GET"],

    authLevel: "anonymous",

    route: "sales-analytics",

    handler: async (request, context) => {

        try {

            /* =====================================================
               CONFIG
               ===================================================== */

            const baseUrl =
                process.env.REDASH_BASE_URL;

            const apiKey =
                process.env.REDASH_API_KEY;

            const storeMasterQueryId =
                process.env.REDASH_STORE_MASTER_QUERY_ID;

            const salesQueryId =
                process.env.REDASH_SALES_QUERY_ID;

            const storeDaysQueryId =
                process.env.REDASH_STORE_DAYS_QUERY_ID;

            const channelQueryId =
                process.env.REDASH_CHANNEL_QUERY_ID;

            const summaryQueryId =
                process.env.REDASH_SALES_SUMMARY_QUERY_ID;


            if (
                !baseUrl ||
                !apiKey ||
                !storeMasterQueryId ||
                !salesQueryId ||
                !storeDaysQueryId
            ) {

                return jsonResponse(
                    500,
                    {
                        success: false,
                        error:
                            "Sales Analytics server configuration missing"
                    }
                );

            }


            /* =====================================================
               URL PARAMETERS
               ===================================================== */

            let from =
                request.query.get("from");

            let to =
                request.query.get("to");


            const region =
                clean(
                    request.query.get("region")
                );

            const circle =
                clean(
                    request.query.get("circle")
                );

            const type =
                clean(
                    request.query.get("type")
                );

            const format =
                clean(
                    request.query.get("format")
                );

            const cohort =
                clean(
                    request.query.get("cohort")
                );

            const status =
                clean(
                    request.query.get("status")
                );

            const city =
                clean(
                    request.query.get("city")
                );

            const store =
                clean(
                    request.query.get("store")
                );

            const source =
                clean(
                    request.query.get("source")
                );

            const areaManager =
                clean(
                    request.query.get("areaManager")
                );


            /* =====================================================
               DEFAULT DATE

               Initial frontend request doesn't provide dates.

               Default:
               Current month first date → today
               ===================================================== */

            if (!from || !to) {

                const today =
                    new Date();

                const firstDay =
                    new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1
                    );


                from =
                    toISO(firstDay);

                to =
                    toISO(today);

            }


            if (
                !isValidDate(from) ||
                !isValidDate(to)
            ) {

                return jsonResponse(
                    400,
                    {
                        success: false,
                        error:
                            "Invalid date. Expected YYYY-MM-DD."
                    }
                );

            }


            context.log(
                `Sales Analytics: ${from} → ${to}`
            );


            /* =====================================================
               LOAD REDASH DATA
               ===================================================== */

            const [
                storeMasterRows,
                salesRows,
                storeDaysRows,
                channelRows
            ] =
                await Promise.all([

                    getRedashRows(
                        baseUrl,
                        apiKey,
                        storeMasterQueryId,
                        null,
                        null,
                        context,
                        "Store Master"
                    ),

                    getRedashRows(
                        baseUrl,
                        apiKey,
                        salesQueryId,
                        from,
                        to,
                        context,
                        "Sales"
                    ),

                    getRedashRows(
                        baseUrl,
                        apiKey,
                        storeDaysQueryId,
                        from,
                        to,
                        context,
                        "Store Days"
                    ),

                    channelQueryId

                        ? getRedashRows(
                            baseUrl,
                            apiKey,
                            channelQueryId,
                            from,
                            to,
                            context,
                            "Channel",
                            true
                        )

                        : Promise.resolve([])

                ]);


            context.log(
                `Store Master Rows: ${storeMasterRows.length}`
            );

            context.log(
                `Sales Rows: ${salesRows.length}`
            );

            context.log(
                `Store Days Rows: ${storeDaysRows.length}`
            );


            /* =====================================================
               NORMALIZE STORE MASTER
               ===================================================== */

            const storesMaster =
                storeMasterRows
                    .map(normalizeStoreMaster)
                    .filter(
                        row =>
                            row.storeCode
                    );


            const masterMap =
                new Map();


            storesMaster.forEach(
                row => {

                    masterMap.set(
                        normalizeCode(
                            row.storeCode
                        ),
                        row
                    );

                }
            );


            /* =====================================================
               NORMALIZE SALES
               ===================================================== */

            let sales =
                salesRows
                    .map(
                        row =>
                            normalizeSales(
                                row,
                                masterMap
                            )
                    )
                    .filter(
                        row =>
                            row.storeCode &&
                            row.date
                    );


            /* =====================================================
               DATE FILTER

               Even if Redash query returned cached/all rows,
               backend will still enforce requested period.
               ===================================================== */

            sales =
                sales.filter(
                    row =>
                        row.date >= from &&
                        row.date <= to
                );


            /* =====================================================
               BUSINESS FILTERS
               ===================================================== */

            sales =
                sales.filter(
                    row => {

                        if (
                            region &&
                            !same(
                                row.region,
                                region
                            )
                        ) {
                            return false;
                        }


                        if (
                            circle &&
                            !same(
                                row.circle,
                                circle
                            )
                        ) {
                            return false;
                        }


                        if (
                            type &&
                            !same(
                                row.type,
                                type
                            )
                        ) {
                            return false;
                        }


                        if (
                            format &&
                            !same(
                                row.format,
                                format
                            )
                        ) {
                            return false;
                        }


                        if (
                            cohort &&
                            !same(
                                row.cohort,
                                cohort
                            )
                        ) {
                            return false;
                        }


                        if (
                            status &&
                            !same(
                                row.status,
                                status
                            )
                        ) {
                            return false;
                        }


                        if (
                            city &&
                            !same(
                                row.city,
                                city
                            )
                        ) {
                            return false;
                        }


                        if (
                            store &&
                            !same(
                                row.storeCode,
                                store
                            )
                        ) {
                            return false;
                        }


                        if (
                            source &&
                            !same(
                                row.source,
                                source
                            )
                        ) {
                            return false;
                        }


                        if (
                            areaManager &&
                            !same(
                                row.areaManager,
                                areaManager
                            )
                        ) {
                            return false;
                        }


                        return true;

                    }
                );


            /* =====================================================
               STORE DAYS

               Store day = unique Store + Date.

               IMPORTANT:
               Source must NOT multiply store days.
               ===================================================== */

            const storeDaySet =
                new Set();


            /*
             First use Store Days query
            */

            storeDaysRows.forEach(
                row => {

                    const storeCode =
                        normalizeCode(
                            pick(
                                row,
                                [
                                    "storecode",
                                    "store_code",
                                    "Store Code",
                                    "Store_Code",
                                    "StoreCode"
                                ]
                            )
                        );


                    const date =
                        normalizeDate(
                            pick(
                                row,
                                [
                                    "date",
                                    "Date",
                                    "businessdate",
                                    "BusinessDate"
                                ]
                            )
                        );


                    if (
                        !storeCode ||
                        !date
                    ) {
                        return;
                    }


                    if (
                        date < from ||
                        date > to
                    ) {
                        return;
                    }


                    /*
                     Only stores existing after current
                     dashboard filters are considered.
                    */

                    const relevant =
                        sales.some(
                            sale =>
                                sale.storeCode ===
                                    storeCode &&
                                sale.date ===
                                    date
                        );


                    if (relevant) {

                        storeDaySet.add(
                            `${storeCode}|${date}`
                        );

                    }

                }
            );


            /*
             Fallback:
             create Store Days from Sales itself.
            */

            sales.forEach(
                row => {

                    storeDaySet.add(
                        `${row.storeCode}|${row.date}`
                    );

                }
            );


            /* =====================================================
               DAILY AGGREGATION
               ===================================================== */

            const dailyMap =
                new Map();


            sales.forEach(
                row => {

                    if (
                        !dailyMap.has(
                            row.date
                        )
                    ) {

                        dailyMap.set(
                            row.date,
                            {
                                date:
                                    row.date,

                                revenue:
                                    0,

                                bills:
                                    0,

                                discount:
                                    0,

                                charges:
                                    0,

                                storeDays:
                                    0
                            }
                        );

                    }


                    const d =
                        dailyMap.get(
                            row.date
                        );


                    d.revenue +=
                        row.revenue;

                    d.bills +=
                        row.bills;

                    d.discount +=
                        row.discount;

                    d.charges +=
                        row.charges;

                }
            );


            /*
             Store Days by Date
            */

            storeDaySet.forEach(
                key => {

                    const parts =
                        key.split("|");

                    const date =
                        parts[1];


                    if (
                        dailyMap.has(date)
                    ) {

                        dailyMap
                            .get(date)
                            .storeDays += 1;

                    }

                }
            );


            const daily =
                [...dailyMap.values()]
                    .map(
                        row => {

                            row.ads =
                                safeDivide(
                                    row.revenue,
                                    row.storeDays
                                );


                            row.adt =
                                safeDivide(
                                    row.bills,
                                    row.storeDays
                                );


                            row.apc =
                                safeDivide(
                                    row.revenue,
                                    row.bills
                                );


                            row.discountPct =
                                discountPercentage(
                                    row.revenue,
                                    row.discount
                                );


                            return row;

                        }
                    )
                    .sort(
                        (a, b) =>
                            a.date.localeCompare(
                                b.date
                            )
                    );


            /* =====================================================
               STORE AGGREGATION
               ===================================================== */

            const storeMap =
                new Map();


            sales.forEach(
                row => {

                    const code =
                        row.storeCode;


                    if (
                        !storeMap.has(code)
                    ) {

                        storeMap.set(
                            code,
                            {
                                storeCode:
                                    code,

                                storeName:
                                    row.storeName,

                                region:
                                    row.region,

                                circle:
                                    row.circle,

                                city:
                                    row.city,

                                type:
                                    row.type,

                                format:
                                    row.format,

                                cohort:
                                    row.cohort,

                                status:
                                    row.status,

                                areaManager:
                                    row.areaManager,

                                revenue:
                                    0,

                                bills:
                                    0,

                                discount:
                                    0,

                                charges:
                                    0,

                                storeDays:
                                    0
                            }
                        );

                    }


                    const target =
                        storeMap.get(code);


                    target.revenue +=
                        row.revenue;

                    target.bills +=
                        row.bills;

                    target.discount +=
                        row.discount;

                    target.charges +=
                        row.charges;

                }
            );


            /*
             Store Days by Store
            */

            storeDaySet.forEach(
                key => {

                    const storeCode =
                        key.split("|")[0];


                    if (
                        storeMap.has(
                            storeCode
                        )
                    ) {

                        storeMap
                            .get(storeCode)
                            .storeDays += 1;

                    }

                }
            );


            const stores =
                [...storeMap.values()]
                    .map(
                        row => {

                            row.ads =
                                safeDivide(
                                    row.revenue,
                                    row.storeDays
                                );


                            row.adt =
                                safeDivide(
                                    row.bills,
                                    row.storeDays
                                );


                            row.apc =
                                safeDivide(
                                    row.revenue,
                                    row.bills
                                );


                            row.discountPct =
                                discountPercentage(
                                    row.revenue,
                                    row.discount
                                );


                            return row;

                        }
                    )
                    .sort(
                        (a, b) =>
                            b.revenue -
                            a.revenue
                    );


            /* =====================================================
               SUMMARY
               ===================================================== */

            const revenue =
                sum(
                    sales,
                    "revenue"
                );


            const bills =
                sum(
                    sales,
                    "bills"
                );


            const discount =
                sum(
                    sales,
                    "discount"
                );


            const charges =
                sum(
                    sales,
                    "charges"
                );


            const storeDays =
                storeDaySet.size;


            const summary = {

                revenue,

                bills,

                discount,

                charges,

                storeDays,

                ads:
                    safeDivide(
                        revenue,
                        storeDays
                    ),

                adt:
                    safeDivide(
                        bills,
                        storeDays
                    ),

                apc:
                    safeDivide(
                        revenue,
                        bills
                    ),

                discountPct:
                    discountPercentage(
                        revenue,
                        discount
                    )

            };


            /* =====================================================
               FILTER OPTIONS
               ===================================================== */

            const filters = {

                regions:
                    unique(
                        storesMaster.map(
                            x =>
                                x.region
                        )
                    ),

                circles:
                    unique(
                        storesMaster.map(
                            x =>
                                x.circle
                        )
                    ),

                types:
                    unique(
                        storesMaster.map(
                            x =>
                                x.type
                        )
                    ),

                formats:
                    unique(
                        storesMaster.map(
                            x =>
                                x.format
                        )
                    ),

                cohorts:
                    unique(
                        storesMaster.map(
                            x =>
                                x.cohort
                        )
                    ),

                statuses:
                    unique(
                        storesMaster.map(
                            x =>
                                x.status
                        )
                    ),

                cities:
                    unique(
                        storesMaster.map(
                            x =>
                                x.city
                        )
                    ),

                areaManagers:
                    unique(
                        storesMaster.map(
                            x =>
                                x.areaManager
                        )
                    ),

                sources:
                    unique(
                        salesRows.map(
                            row =>
                                clean(
                                    pick(
                                        row,
                                        [
                                            "source",
                                            "Source",
                                            "channel",
                                            "Channel"
                                        ]
                                    )
                                )
                        )
                    ),

                stores:
                    storesMaster
                        .map(
                            row => ({
                                storeCode:
                                    row.storeCode,

                                storeName:
                                    row.storeName
                            })
                        )
                        .sort(
                            (a, b) =>
                                String(
                                    a.storeCode
                                )
                                    .localeCompare(
                                        String(
                                            b.storeCode
                                        )
                                    )
                        )

            };


            /* =====================================================
               DETAIL FOR CHANNEL CONTRIBUTION
               ===================================================== */

            const detail =
                sales.map(
                    row => ({
                        storeCode:
                            row.storeCode,

                        date:
                            row.date,

                        source:
                            row.source,

                        revenue:
                            row.revenue,

                        bills:
                            row.bills,

                        discount:
                            row.discount,

                        charges:
                            row.charges
                    })
                );


            /* =====================================================
               RESPONSE
               ===================================================== */

            return jsonResponse(
                200,
                {

                    success: true,

                    period: {
                        from,
                        to
                    },

                    summary,

                    filters,

                    daily,

                    stores,

                    detail,

                    meta: {

                        salesRows:
                            sales.length,

                        storeCount:
                            stores.length,

                        storeDays:
                            storeDays,

                        dailyRows:
                            daily.length

                    }

                }
            );


        } catch (error) {

            context.error(
                "SALES ANALYTICS ERROR:",
                error
            );


            return jsonResponse(
                500,
                {

                    success: false,

                    error:
                        error?.message ||
                        "Unable to load Sales Analytics"

                }
            );

        }

    }

});


/* =========================================================
   REDASH
   ========================================================= */

async function getRedashRows(
    baseUrl,
    apiKey,
    queryId,
    startDate,
    endDate,
    context,
    name,
    optional = false
) {

    if (!queryId) {

        if (optional) {
            return [];
        }

        throw new Error(
            `${name} Query ID missing`
        );

    }


    let url =

        `${baseUrl.replace(/\/$/, "")}` +

        `/api/queries/` +

        `${encodeURIComponent(queryId)}` +

        `/results.json` +

        `?api_key=${encodeURIComponent(apiKey)}`;


    if (
        startDate &&
        endDate
    ) {

        url +=

            `&p_StartDate=${encodeURIComponent(startDate)}` +

            `&p_EndDate=${encodeURIComponent(endDate)}`;

    }


    context.log(
        `Loading Redash ${name} Query ${queryId}`
    );


    let response =
        await fetch(url);


    let text =
        await response.text();


    /*
     Some Redash queries may NOT have StartDate/EndDate parameters.
     Retry cached result without parameters.
    */

    if (
        !response.ok &&
        startDate &&
        endDate
    ) {

        context.warn(
            `${name} parameter request failed. Retrying cached result.`
        );


        const fallbackUrl =

            `${baseUrl.replace(/\/$/, "")}` +

            `/api/queries/` +

            `${encodeURIComponent(queryId)}` +

            `/results.json` +

            `?api_key=${encodeURIComponent(apiKey)}`;


        response =
            await fetch(
                fallbackUrl
            );


        text =
            await response.text();

    }


    if (!response.ok) {

        context.error(
            `${name} Redash Error`,
            response.status,
            text
        );


        if (optional) {
            return [];
        }


        throw new Error(
            `${name} Redash request failed (${response.status})`
        );

    }


    if (!text) {

        if (optional) {
            return [];
        }


        throw new Error(
            `${name} returned empty response`
        );

    }


    let payload;


    try {

        payload =
            JSON.parse(text);

    } catch {

        throw new Error(
            `${name} returned invalid JSON`
        );

    }


    return (

        payload?.query_result?.data?.rows

        ||

        payload?.data?.rows

        ||

        payload?.rows

        ||

        []

    );

}


/* =========================================================
   NORMALIZE STORE MASTER
   ========================================================= */

function normalizeStoreMaster(row) {

    return {

        storeCode:
            normalizeCode(
                pick(
                    row,
                    [
                        "Store_Code",
                        "Store Code",
                        "storecode",
                        "store_code",
                        "StoreCode"
                    ]
                )
            ),

        storeName:
            clean(
                pick(
                    row,
                    [
                        "Store_Name",
                        "Store Name",
                        "store_name",
                        "storename"
                    ]
                )
            ),

        type:
            clean(
                pick(
                    row,
                    [
                        "Type",
                        "type"
                    ]
                )
            ),

        format:
            clean(
                pick(
                    row,
                    [
                        "Format",
                        "format"
                    ]
                )
            ),

        region:
            clean(
                pick(
                    row,
                    [
                        "Region",
                        "region"
                    ]
                )
            ),

        circle:
            clean(
                pick(
                    row,
                    [
                        "Circle",
                        "circle"
                    ]
                )
            ),

        city:
            clean(
                pick(
                    row,
                    [
                        "City",
                        "city"
                    ]
                )
            ),

        cohort:
            clean(
                pick(
                    row,
                    [
                        "Cohort",
                        "cohort"
                    ]
                )
            ),

        status:
            clean(
                pick(
                    row,
                    [
                        "Status",
                        "status"
                    ]
                )
            ),

        areaManager:
            clean(
                pick(
                    row,
                    [
                        "Area_Manager",
                        "Area Manager",
                        "area_manager",
                        "areamanager"
                    ]
                )
            )

    };

}


/* =========================================================
   NORMALIZE SALES
   ========================================================= */

function normalizeSales(
    row,
    masterMap
) {

    const storeCode =
        normalizeCode(
            pick(
                row,
                [
                    "storecode",
                    "Storecode",
                    "StoreCode",
                    "Store_Code",
                    "Store Code"
                ]
            )
        );


    const master =
        masterMap.get(
            storeCode
        ) || {};


    const netSale =
        num(
            pick(
                row,
                [
                    "net_sale",
                    "Net_Sale",
                    "Net Sale",
                    "netsale"
                ]
            )
        );


    const charges =
        num(
            pick(
                row,
                [
                    "charges",
                    "Charges",
                    "charge",
                    "Charge"
                ]
            )
        );


    let revenue =
        num(
            pick(
                row,
                [
                    "revenue",
                    "Revenue"
                ]
            )
        );


    /*
     If Revenue column does not exist:
     Revenue = Net Sale + Charges
    */

    if (!revenue) {

        revenue =
            netSale +
            charges;

    }


    return {

        storeCode,

        date:
            normalizeDate(
                pick(
                    row,
                    [
                        "date",
                        "Date",
                        "businessdate",
                        "BusinessDate"
                    ]
                )
            ),

        source:
            clean(
                pick(
                    row,
                    [
                        "source",
                        "Source",
                        "channel",
                        "Channel"
                    ]
                )
            ) || "Unknown",

        revenue,

        netSale,

        charges,

        bills:
            num(
                pick(
                    row,
                    [
                        "no_of_bills",
                        "No_Of_Bills",
                        "No Of Bills",
                        "bills",
                        "Bills"
                    ]
                )
            ),

        discount:
            num(
                pick(
                    row,
                    [
                        "discount",
                        "Discount"
                    ]
                )
            ),

        storeName:
            master.storeName || "",

        region:
            master.region || "",

        circle:
            master.circle || "",

        city:
            master.city || "",

        type:
            master.type || "",

        format:
            master.format || "",

        cohort:
            master.cohort || "",

        status:
            master.status || "",

        areaManager:
            master.areaManager || ""

    };

}


/* =========================================================
   HELPERS
   ========================================================= */

function pick(
    object,
    keys
) {

    for (
        const key
        of keys
    ) {

        if (
            object &&
            object[key] !== undefined &&
            object[key] !== null
        ) {

            return object[key];

        }

    }


    /*
     Case-insensitive fallback
    */

    if (!object) {
        return null;
    }


    const objectKeys =
        Object.keys(object);


    for (
        const wanted
        of keys
    ) {

        const found =
            objectKeys.find(
                key =>
                    key.toLowerCase() ===
                    wanted.toLowerCase()
            );


        if (found) {

            return object[found];

        }

    }


    return null;

}


function clean(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value).trim();

}


function normalizeCode(value) {

    return clean(value)
        .toUpperCase();

}


function normalizeDate(value) {

    if (!value) {
        return "";
    }


    const text =
        String(value);


    const match =
        text.match(
            /^\d{4}-\d{2}-\d{2}/
        );


    if (match) {

        return match[0];

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return toISO(date);

}


function num(value) {

    const n =
        Number(value);


    return Number.isFinite(n)
        ? n
        : 0;

}


function sum(
    rows,
    field
) {

    return rows.reduce(
        (total, row) =>
            total +
            num(
                row[field]
            ),
        0
    );

}


function safeDivide(
    numerator,
    denominator
) {

    numerator =
        num(numerator);

    denominator =
        num(denominator);


    return denominator
        ? numerator / denominator
        : 0;

}


function discountPercentage(
    revenue,
    discount
) {

    revenue =
        num(revenue);

    discount =
        num(discount);


    /*
     Gross Base =
     Revenue + Discount
    */

    const grossBase =
        revenue +
        discount;


    return grossBase
        ? (
            discount /
            grossBase
        ) * 100
        : 0;

}


function unique(values) {

    return [

        ...new Set(

            values
                .map(clean)
                .filter(Boolean)

        )

    ].sort(
        (a, b) =>
            a.localeCompare(b)
    );

}


function same(
    first,
    second
) {

    return clean(first)
        .toLowerCase() ===
        clean(second)
            .toLowerCase();

}


function isValidDate(value) {

    return /^\d{4}-\d{2}-\d{2}$/
        .test(
            String(value || "")
        );

}


function toISO(date) {

    return (
        `${date.getFullYear()}-` +
        `${String(
            date.getMonth() + 1
        ).padStart(2, "0")}-` +
        `${String(
            date.getDate()
        ).padStart(2, "0")}`
    );

}


function jsonResponse(
    status,
    body
) {

    return {

        status,

        headers: {

            "Content-Type":
                "application/json",

            "Cache-Control":
                "no-store"

        },

        jsonBody:
            body

    };

}
