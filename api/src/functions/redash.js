
const { app } = require("@azure/functions");

app.http("redash", {

    methods: ["GET"],

    authLevel: "anonymous",

    route: "redash",

    handler: async (request, context) => {

        try {

            const baseUrl =
                process.env.REDASH_BASE_URL;

            const apiKey =
                process.env.REDASH_API_KEY;


            const queryMap = {

                storeMaster:
                    process.env.REDASH_STORE_MASTER_QUERY_ID,

                channel:
                    process.env.REDASH_CHANNEL_QUERY_ID

            };


            if (!baseUrl || !apiKey) {

                return {

                    status: 500,

                    jsonBody: {

                        success: false,

                        error:
                            "Redash configuration missing"

                    }

                };

            }


            const dataset =
                request.query.get("dataset");


            if (
                !dataset ||
                !queryMap[dataset]
            ) {

                return {

                    status: 400,

                    jsonBody: {

                        success: false,

                        error:
                            "Invalid dataset"

                    }

                };

            }


            const queryId =
                queryMap[dataset];


            const url =

                `${baseUrl.replace(/\/$/, "")}` +

                `/api/queries/` +

                `${encodeURIComponent(queryId)}` +

                `/results.json` +

                `?api_key=${encodeURIComponent(apiKey)}`;


            context.log(
                `Loading Redash dataset: ${dataset}`
            );


            const response =
                await fetch(url);


            const text =
                await response.text();


            if (!response.ok) {

                context.error(
                    "Redash error:",
                    response.status,
                    text
                );


                return {

                    status: 502,

                    jsonBody: {

                        success: false,

                        error:
                            "Redash request failed"

                    }

                };

            }


            if (!text) {

                return {

                    status: 502,

                    jsonBody: {

                        success: false,

                        error:
                            "Redash returned empty response"

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

                    "Cache-Control":
                        "no-store"

                },

                jsonBody: {

                    success: true,

                    dataset,

                    rowCount:
                        rows.length,

                    rows

                }

            };


        } catch (error) {

            context.error(
                "REDASH API ERROR:",
                error
            );


            return {

                status: 500,

                jsonBody: {

                    success: false,

                    error:
                        "Unable to load Redash data"

                }

            };

        }

    }

});
