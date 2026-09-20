export default async (request) => {

    return new Response(
        JSON.stringify({
            success: true,
            message: "Netlify publishing function is working."
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

};