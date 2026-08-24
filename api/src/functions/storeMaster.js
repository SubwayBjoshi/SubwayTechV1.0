const { app } = require("@azure/functions");

app.http("storeMaster", {

    methods: ["GET"],
    authLevel: "anonymous",
    route: "store-master",

    handler: async (request, context) => {

        try {

            const baseUrl =
                process.env.REDASH_BASE_URL;

            const apiKey =
                process.env.REDASH_API_KEY;

            const queryId =
                process.env.REDASH_STORE_MASTER_QUERY_ID;


            if (!baseUrl || !apiKey || !queryId) {

                return {
                    status: 500,
                    jsonBody: {
                        success: false,
                        error: "Store Master configuration missing"
                    }
                };

            }


            const redashUrl =
                `${baseUrl.replace(/\/$/, "")}` +
                `/api/queries/${encodeURIComponent(queryId)}` +
                `/results.json?api_key=${encodeURIComponent(apiKey)}`;


            const response =
                await fetch(redashUrl);


            const text =
                await response.text();


            if (!response.ok) {

                context.error(
                    "Redash Store Master error:",
                    response.status,
                    text
                );


                return {
                    status: 502,
                    jsonBody: {
                        success: false,
                        error: "Unable to load Store Master"
                    }
                };

            }


            if (!text) {

                return {
                    status: 502,
                    jsonBody: {
                        success: false,
                        error: "Empty Store Master response"
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


            return {

                status: 200,

                headers: {
                    "Cache-Control": "no-store"
                },

                jsonBody: {

                    success: true,

                    totalStores:
                        rows.length,

                    stores:
                        rows

                }

            };


        } catch (error) {

            context.error(
                "Store Master API Error:",
                error
            );


            return {

                status: 500,

                jsonBody: {
                    success: false,
                    error:
                        "Unable to load Store Master"
                }

            };

        }

    }

});
