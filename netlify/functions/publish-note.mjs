export default async () => {

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
        return new Response(
            JSON.stringify({
                success: false,
                message: "GitHub environment variables are missing."
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }

    try {

        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            return new Response(
                JSON.stringify({
                    success: false,
                    message: "GitHub connection failed.",
                    githubStatus: response.status,
                    githubMessage: data.message
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "GitHub connection is working.",
                repository: data.full_name,
                private: data.private
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (error) {

        console.error(error);

        return new Response(
            JSON.stringify({
                success: false,
                message: "Could not connect to GitHub."
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }

};