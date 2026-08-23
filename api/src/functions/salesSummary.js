
const { app } = require("@azure/functions");

app.http("salesSummary", {

    methods: ["GET"],

    authLevel: "anonymous",

    route: "sales-summary",

    handler: async (request, context) => {

        try {

            const baseUrl =
                process.env.REDASH_BASE_URL;

            const apiKey =
                process.env.REDASH_API_KEY;

            const queryId =
                process.env.REDASH_SALES_SUMMARY_QUERY_ID;


            const startDate =
                request.query.get("startDate");

            const endDate =
                request.query.get("endDate");


            if (
                !baseUrl ||
                !apiKey ||
                !queryId
            ) {

                return {

                    status: 500,

                    jsonBody: {

                        success: false,

                        error:
                            "Server configuration missing"

                    }

                };

            }


            if (
                !startDate ||
                !endDate
            ) {

                return {

                    status: 400,

                    jsonBody: {

                        success: false,

                        error:
                            "startDate and endDate are required"

                    }

                };

            }


            const pattern =
                /^\d{4}-\d{2}-\d{2}$/;


            if (
                !pattern.test(startDate) ||
                !pattern.test(endDate)
            ) {

                return {

                    status: 400,

                    jsonBody: {

                        success: false,

                        error:
                            "Dates must use YYYY-MM-DD"

                    }

                };

            }


            const url =

                `${baseUrl.replace(/\/$/, "")}` +

                `/api/queries/` +

                `${encodeURIComponent(queryId)}` +

                `/results.json` +

                `?api_key=${encodeURIComponent(apiKey)}` +

                `&p_StartDate=${encodeURIComponent(startDate)}` +

                `&p_EndDate=${encodeURIComponent(endDate)}`;


            context.log(
                `Sales Summary ${startDate} → ${endDate}`
            );


            const response =
                await fetch(url);


            const text =
                await response.text();


            if (!response.ok) {

                context.error(
                    response.status,
                    text
                );


                return {

                    status: 502,

                    jsonBody: {

                        success: false,

                        error:
                            "Redash sales summary failed"

                    }

                };

            }


            if (!text) {

                return {

                    status: 502,

                    jsonBody: {

                        success: false,

                        error:
                            "Empty Redash response"

                    }

                };

            }


            const payload =
                JSON.parse(text);


            const rows =

                payload?.query_result?.data?.rows

                ||

                payload?.data?.rows

                ||

                payload?.rows

                ||

                [];


            const row =
                rows[0] || {};


            return {

                status: 200,

                headers: {

                    "Cache-Control":
                        "no-store"

                },

                jsonBody: {

                    success: true,

                    period: {

                        startDate,
                        endDate

                    },

                    summary: {

                        revenue:
                            num(row.revenue),

                        bills:
                            num(row.bills),

                        discount:
                            num(row.discount),

                        charges:
                            num(row.charges),

                        storeDays:
                            num(row.store_days),

                        ads:
                            num(row.ads),

                        adt:
                            num(row.adt),

                        apc:
                            num(row.apc),

                        discountPct:
                            num(row.discount_pct)

                    }

                }

            };


        } catch (error) {

            context.error(
                "SALES SUMMARY ERROR:",
                error
            );


            return {

                status: 500,

                jsonBody: {

                    success: false,

                    error:
                        "Unable to load Sales Summary"

                }

            };

        }

    }

});


function num(value) {

    const n =
        Number(value);

    return Number.isFinite(n)
        ? n
        : 0;

}
