/* =====================================================
   CMS LOGIN
   Secure HttpOnly session cookie
===================================================== */

function jsonResponse(data, status = 200, headers = {}) {

    return new Response(
        JSON.stringify(data),
        {
            status,

            headers: {
                "Content-Type":
                    "application/json",

                "Cache-Control":
                    "no-store",

                ...headers
            }
        }
    );
}


/* =====================================================
   MAIN FUNCTION
===================================================== */

export default async (request) => {

    /*
        Only POST is allowed.
    */

    if (request.method !== "POST") {

        return jsonResponse(
            {
                success: false,
                message:
                    "Method not allowed."
            },
            405
        );
    }


    try {

        /*
            Read submitted login data.
        */

        const body =
            await request.json();


        const submittedToken =
            String(
                body.token || ""
            ).trim();


        /*
            Get the real secret from
            Netlify environment variables.

            This value NEVER appears
            in the browser code.
        */

        const expectedToken =
            process.env.CMS_ADMIN_TOKEN;


        /*
            Server configuration check.
        */

        if (!expectedToken) {

            console.error(
                "CMS_ADMIN_TOKEN is not configured."
            );

            return jsonResponse(
                {
                    success: false,
                    message:
                        "CMS authentication is not configured."
                },
                500
            );
        }


        /*
            Validate submitted token.
        */

        if (
            !submittedToken ||
            submittedToken !== expectedToken
        ) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "Invalid CMS credentials."
                },
                401
            );
        }


        /*
            Successful login.

            The CMS token is stored inside an
            HttpOnly cookie.

            JavaScript cannot read this cookie.

            Secure:
            Only HTTPS.

            SameSite=Strict:
            Helps prevent cross-site requests.

            Path=/:
            Available to the whole site.

            Max-Age:
            Session expires after 8 hours.
        */

        const cookie =
            [
                `cms_session=${encodeURIComponent(expectedToken)}`,
                "Path=/",
                "HttpOnly",
                "Secure",
                "SameSite=Strict",
                "Max-Age=28800"
            ].join("; ");


        return jsonResponse(

            {
                success: true,
                message:
                    "CMS login successful."
            },

            200,

            {
                "Set-Cookie":
                    cookie
            }
        );


    } catch (error) {

        console.error(
            "CMS login error:",
            error
        );


        return jsonResponse(
            {
                success: false,
                message:
                    "Invalid login request."
            },
            400
        );
    }
};