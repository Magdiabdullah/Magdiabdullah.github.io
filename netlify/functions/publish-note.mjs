const GITHUB_API = "https://api.github.com";
const BRANCH = "main";

function jsonResponse(data, status = 200) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
}

function slugify(text) {
    return text
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
}

function getExtension(mimeType) {

    const extensions = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg"
    };

    return extensions[mimeType] || "png";
}

function githubHeaders(token) {
    return {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "Content-Type": "application/json"
    };
}


/* =====================================================
   GET EXISTING FILE
===================================================== */

async function getFileSha(
    owner,
    repo,
    path,
    token
) {

    const response = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`,
        {
            method: "GET",
            headers: githubHeaders(token)
        }
    );

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
            `Could not check GitHub file ${path}: ${data.message || response.status}`
        );
    }

    const data = await response.json();

    return data.sha;
}


/* =====================================================
   CREATE / UPDATE FILE
===================================================== */

async function writeGitHubFile(
    owner,
    repo,
    path,
    contentBase64,
    message,
    token
) {

    const existingSha =
        await getFileSha(
            owner,
            repo,
            path,
            token
        );


    const body = {
        message,
        content: contentBase64,
        branch: BRANCH
    };


    if (existingSha) {
        body.sha = existingSha;
    }


    const response = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
        {
            method: "PUT",
            headers: githubHeaders(token),
            body: JSON.stringify(body)
        }
    );


    const data =
        await response.json().catch(() => ({}));


    if (!response.ok) {

        throw new Error(
            `GitHub could not write ${path}: ${
                data.message || response.status
            }`
        );

    }


    return data;
}


/* =====================================================
   EXTRACT DATA URL IMAGES
===================================================== */

async function processImages(
    html,
    slug,
    owner,
    repo,
    token
) {

    const imageRegex =
        /<img([^>]+)src=["'](data:image\/([^;]+);base64,([^"']+))["']([^>]*)>/gi;

    let imageNumber = 0;

    let processedHTML = html;

    const matches = [
        ...html.matchAll(imageRegex)
    ];


    for (const match of matches) {

        imageNumber++;


        const fullTag = match[0];

        const mimeSubtype = match[3];

        const base64Data = match[4];

        const mimeType =
            `image/${mimeSubtype}`;


        const extension =
            getExtension(mimeType);


        const fileName =
            `image-${imageNumber}.${extension}`;


        const imagePath =
            `assets/blog/${slug}/${fileName}`;


        await writeGitHubFile(
            owner,
            repo,
            imagePath,
            base64Data,
            `Add image for ${slug}`,
            token
        );


        /*
            Article files live inside /posts/.

            Therefore the correct relative path is:

            ../assets/blog/...
        */

        const publicPath =
            `../assets/blog/${slug}/${fileName}`;


        const newTag =
            fullTag.replace(
                match[2],
                publicPath
            );


        processedHTML =
            processedHTML.replace(
                fullTag,
                newTag
            );

    }


    return processedHTML;
}


/* =====================================================
   BASIC HTML SAFETY
===================================================== */

function cleanArticleHTML(html) {

    let cleaned = html;


    /*
        Remove script elements.
    */

    cleaned =
        cleaned.replace(
            /<script\b[^>]*>[\s\S]*?<\/script>/gi,
            ""
        );


    /*
        Remove javascript: URLs.
    */

    cleaned =
        cleaned.replace(
            /javascript\s*:/gi,
            ""
        );


    /*
        Remove inline event handlers such as:

        onclick=
        onerror=
        onload=
    */

    cleaned =
        cleaned.replace(
            /\s+on[a-z]+\s*=\s*(['"]).*?\1/gi,
            ""
        );


    return cleaned;
}


/* =====================================================
   CREATE ARTICLE HTML
===================================================== */

function createArticleHTML({
    title,
    category,
    tags,
    content,
    date
}) {

    const safeTitle =
        title.replace(
            /</g,
            "&lt;"
        ).replace(
            />/g,
            "&gt;"
        );


    const safeCategory =
        category.replace(
            /</g,
            "&lt;"
        ).replace(
            />/g,
            "&gt;"
        );


    const safeTags =
        tags.replace(
            /</g,
            "&lt;"
        ).replace(
            />/g,
            "&gt;"
        );


    return `<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0">

    <title>${safeTitle} | Magdi Saad</title>

    <link
        rel="stylesheet"
        href="../style.css">

    <style>

        body {
            background: #050806;
            color: #d9e8de;
        }

        .post-wrapper {
            width: min(900px, 92%);
            margin: 60px auto 100px;
        }

        .post-category {
            color: #00ff88;
            font-family: monospace;
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .post-title {
            color: #ffffff;
            font-size: clamp(32px, 6vw, 56px);
            line-height: 1.1;
            margin: 15px 0;
        }

        .post-meta {
            color: #6f8c7b;
            font-family: monospace;
            font-size: 12px;
            margin-bottom: 45px;
        }

        .post-content {
            font-size: 17px;
            line-height: 1.85;
        }

        .post-content p {
            margin-bottom: 22px;
        }

        .post-content figure {
            margin: 35px auto;
            text-align: center;
        }

        .post-content img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
            border-radius: 8px;
            border: 1px solid rgba(0,255,140,.15);
        }

        .post-content figcaption {
            margin-top: 10px;
            color: #6f8c7b;
            font-size: 13px;
            font-style: italic;
        }

        .post-content pre {
            background: #020503;
            border: 1px solid rgba(0,255,140,.18);
            border-left: 3px solid #00ff88;
            border-radius: 6px;
            padding: 20px;
            overflow-x: auto;
            color: #9dffca;
            font-family: "Courier New", monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .post-content code {
            font-family: "Courier New", monospace;
        }

        .back-link {
            display: inline-block;
            margin-bottom: 40px;
            color: #00ff88;
            text-decoration: none;
            font-family: monospace;
            font-size: 13px;
        }

        .back-link:hover {
            text-decoration: underline;
        }

    </style>

</head>

<body>

    <main class="post-wrapper">

        <a
            class="back-link"
            href="../blog.html">
            ← BACK TO SECURITY NOTES
        </a>

        <div class="post-category">
            ${safeCategory}
        </div>

        <h1 class="post-title">
            ${safeTitle}
        </h1>

        <div class="post-meta">
            ${date}
            ${safeTags ? ` • ${safeTags}` : ""}
        </div>

        <article class="post-content">

            ${content}

        </article>

    </main>

</body>

</html>`;
}


/* =====================================================
   MAIN FUNCTION
===================================================== */

export default async (request) => {

    /*
        Only POST is allowed for publishing.
    */

    if (request.method !== "POST") {

        return jsonResponse(
            {
                success: false,
                message: "Use POST to publish a note."
            },
            405
        );

    }


    const token =
        process.env.GITHUB_TOKEN;

    const owner =
        process.env.GITHUB_OWNER;

    const repo =
        process.env.GITHUB_REPO;


    if (!token || !owner || !repo) {

        return jsonResponse(
            {
                success: false,
                message:
                    "GitHub environment variables are missing."
            },
            500
        );

    }


    try {

        const body =
            await request.json();


        const title =
            String(body.title || "").trim();

        const category =
            String(body.category || "Cybersecurity").trim();

        const tags =
            String(body.tags || "").trim();

        let content =
            String(body.content || "").trim();


        if (!title) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "A note title is required."
                },
                400
            );

        }


        if (!content) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "The article content is empty."
                },
                400
            );

        }


        let slug =
            slugify(title);


        if (!slug) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "Could not create a valid article slug."
                },
                400
            );

        }


        /*
            Limit slug length and avoid accidental
            path manipulation.
        */

        slug =
            slug.replace(
                /[^a-z0-9-]/g,
                ""
            );


        /*
            Clean article HTML before publishing.
        */

        content =
            cleanArticleHTML(content);


        const date =
            new Date().toISOString().split("T")[0];


        /*
            Convert locally embedded images into
            real GitHub files.
        */

        content =
            await processImages(
                content,
                slug,
                owner,
                repo,
                token
            );


        /*
            Build the final article.
        */

        const articleHTML =
            createArticleHTML({
                title,
                category,
                tags,
                content,
                date
            });


        const articlePath =
            `posts/${slug}.html`;


        /*
            Encode article as UTF-8 Base64.
        */

        const articleBase64 =
            Buffer.from(
                articleHTML,
                "utf8"
            ).toString("base64");


        await writeGitHubFile(
            owner,
            repo,
            articlePath,
            articleBase64,
            `Publish note: ${title}`,
            token
        );


        /*
            Prepare a lightweight public index.

            If posts/index.json already exists,
            keep its existing entries.
        */

        const indexPath =
            "posts/index.json";


        let posts = [];


        const indexResponse =
            await fetch(
                `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(indexPath)}?ref=${BRANCH}`,
                {
                    method: "GET",
                    headers: githubHeaders(token)
                }
            );


        if (indexResponse.ok) {

            const indexData =
                await indexResponse.json();


            if (indexData.content) {

                try {

                    const decoded =
                        Buffer.from(
                            indexData.content.replace(/\n/g, ""),
                            "base64"
                        ).toString("utf8");


                    const existing =
                        JSON.parse(decoded);


                    if (Array.isArray(existing)) {
                        posts = existing;
                    }

                } catch {
                    posts = [];
                }

            }

        }


        /*
            Remove an existing entry for the same slug.
        */

        posts =
            posts.filter(
                post =>
                    post.slug !== slug
            );


        /*
            Create a short excerpt.
        */

        const plainText =
            content
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim();


        const excerpt =
            plainText.length > 180
                ? `${plainText.slice(0, 180)}...`
                : plainText;


        posts.unshift({

            slug,

            title,

            category,

            tags,

            date,

            excerpt,

            url:
                `posts/${slug}.html`

        });


        /*
            Newest posts first.
        */

        posts.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


        const indexJSON =
            JSON.stringify(
                posts,
                null,
                2
            );


        const indexBase64 =
            Buffer.from(
                indexJSON,
                "utf8"
            ).toString("base64");


        await writeGitHubFile(
            owner,
            repo,
            indexPath,
            indexBase64,
            `Update blog index for ${title}`,
            token
        );


        return jsonResponse({

            success: true,

            message:
                "Note published successfully.",

            slug,

            article:
                articlePath,

            index:
                indexPath,

            images:
                `assets/blog/${slug}/`

        });


    } catch (error) {

        console.error(
            "Publish error:",
            error
        );


        return jsonResponse(
            {
                success: false,
                message:
                    error.message ||
                    "Publishing failed."
            },
            500
        );

    }

};