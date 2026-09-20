/* =====================================================
   CMS LOGOUT
   Clear the HttpOnly CMS session cookie
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


    /*
        Expire the CMS session immediately.

        Max-Age=0 tells the browser
        to remove the cookie.

        The attributes match the
        login cookie.
    */

    const cookie =
        [
            "cms_session=",
            "Path=/",
            "HttpOnly",
            "Secure",
            "SameSite=Strict",
            "Max-Age=0"
        ].join("; ");


    return jsonResponse(

        {
            success: true,
            message:
                "CMS logout successful."
        },

        200,

        {
            "Set-Cookie":
                cookie
        }
    );
};