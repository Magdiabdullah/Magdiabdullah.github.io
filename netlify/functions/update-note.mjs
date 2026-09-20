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


/* =====================================================
   CMS AUTHORIZATION
===================================================== */

function isAuthorized(request) {

    const expectedToken =
        process.env.CMS_ADMIN_TOKEN;

    if (!expectedToken) {
        return false;
    }

    const authorization =
        request.headers.get("authorization") || "";

    return authorization ===
        `Bearer ${expectedToken}`;
}


/* =====================================================
   SLUG VALIDATION
===================================================== */

function isValidSlug(slug) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}


/* =====================================================
   GITHUB HEADERS
===================================================== */

function githubHeaders(token) {
    return {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "Content-Type": "application/json"
    };
}


/* =====================================================
   GET GITHUB FILE
===================================================== */

async function getGitHubFile(
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

        const data =
            await response.json().catch(() => ({}));

        throw new Error(
            `Could not read GitHub file ${path}: ${
                data.message || response.status
            }`
        );
    }

    const data =
        await response.json();

    if (!data.content) {
        throw new Error(
            `GitHub file ${path} has no content.`
        );
    }

    const content =
        Buffer.from(
            data.content.replace(/\n/g, ""),
            "base64"
        ).toString("utf8");

    return {
        content,
        sha: data.sha
    };
}


/* =====================================================
   GET FILE SHA
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

        const data =
            await response.json().catch(() => ({}));

        throw new Error(
            `Could not check GitHub file ${path}: ${
                data.message || response.status
            }`
        );
    }

    const data =
        await response.json();

    return data.sha;
}


/* =====================================================
   CREATE / UPDATE GITHUB FILE
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

    const response =
        await fetch(
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
   DELETE GITHUB FILE
===================================================== */

async function deleteGitHubFile(
    owner,
    repo,
    path,
    token
) {

    const sha =
        await getFileSha(
            owner,
            repo,
            path,
            token
        );

    if (!sha) {
        return false;
    }

    const response =
        await fetch(
            `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
            {
                method: "DELETE",
                headers: githubHeaders(token),
                body: JSON.stringify({
                    message: `Remove old image from ${path}`,
                    sha,
                    branch: BRANCH
                })
            }
        );

    const data =
        await response.json().catch(() => ({}));

    if (!response.ok) {

        throw new Error(
            `GitHub could not delete ${path}: ${
                data.message || response.status
            }`
        );
    }

    return true;
}


/* =====================================================
   LIST IMAGE FILES
===================================================== */

async function listImageFiles(
    owner,
    repo,
    slug,
    token
) {

    const path =
        `assets/blog/${slug}`;

    const response =
        await fetch(
            `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`,
            {
                method: "GET",
                headers: githubHeaders(token)
            }
        );

    if (response.status === 404) {
        return [];
    }

    if (!response.ok) {

        const data =
            await response.json().catch(() => ({}));

        throw new Error(
            `Could not list images for ${slug}: ${
                data.message || response.status
            }`
        );
    }

    const data =
        await response.json();

    if (!Array.isArray(data)) {
        return [];
    }

    return data.filter(
        file =>
            file.type === "file" &&
            /^image-\d+\.(jpg|jpeg|png|gif|webp|svg)$/i.test(
                file.name
            )
    );
}


/* =====================================================
   IMAGE EXTENSION
===================================================== */

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


/* =====================================================
   PROCESS NEW DATA URL IMAGES
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

        const fullTag =
            match[0];

        const mimeSubtype =
            match[3];

        const base64Data =
            match[4];

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
            `Update image for ${slug}`,
            token
        );

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

    cleaned =
        cleaned.replace(
            /<script\b[^>]*>[\s\S]*?<\/script>/gi,
            ""
        );

    cleaned =
        cleaned.replace(
            /javascript\s*:/gi,
            ""
        );

    cleaned =
        cleaned.replace(
            /\s+on[a-z]+\s*=\s*(['"]).*?\1/gi,
            ""
        );

    return cleaned;
}


/* =====================================================
   EXTRACT ARTICLE CONTENT
===================================================== */

function extractArticleData(html) {

    const categoryMatch =
        html.match(
            /<div\s+class=["']post-category["']>([\s\S]*?)<\/div>/i
        );

    const titleMatch =
        html.match(
            /<h1\s+class=["']post-title["']>([\s\S]*?)<\/h1>/i
        );

    const metaMatch =
        html.match(
            /<div\s+class=["']post-meta["']>([\s\S]*?)<\/div>/i
        );

    const contentMatch =
        html.match(
            /<article\s+class=["']post-content["']>([\s\S]*?)<\/article>/i
        );

    if (!contentMatch) {
        throw new Error(
            "Could not find the article content."
        );
    }

    const decodeHTML =
        value =>
            String(value || "")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();

    const title =
        decodeHTML(
            titleMatch
                ? titleMatch[1]
                : ""
        );

    const category =
        decodeHTML(
            categoryMatch
                ? categoryMatch[1]
                : "Cybersecurity"
        );

    let tags = "";

    if (metaMatch) {

        const meta =
            decodeHTML(
                metaMatch[1]
            );

        const parts =
            meta.split(" • ");

        if (parts.length > 1) {
            tags =
                parts
                    .slice(1)
                    .join(" • ")
                    .trim();
        }
    }

    let content =
        contentMatch[1].trim();

    /*
        Published articles use:

        ../assets/blog/...

        The admin editor is located at:

        /admin.html

        So convert the image path to:

        /assets/blog/...

        while editing.
    */

    content =
        content.replace(
            /\.\.\/assets\/blog\//g,
            "/assets/blog/"
        );

    return {
        title,
        category,
        tags,
        content
    };
}


/* =====================================================
   BUILD UPDATED ARTICLE
===================================================== */

function createArticleHTML({
    title,
    category,
    tags,
    content,
    date
}) {

    const safeTitle =
        title
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    const safeCategory =
        category
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    const safeTags =
        tags
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

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
   GET CURRENT BLOG INDEX
===================================================== */

async function getPostsIndex(
    owner,
    repo,
    token
) {

    const indexPath =
        "posts/index.json";

    const file =
        await getGitHubFile(
            owner,
            repo,
            indexPath,
            token
        );

    if (!file) {
        return [];
    }

    try {

        const posts =
            JSON.parse(
                file.content
            );

        return Array.isArray(posts)
            ? posts
            : [];

    } catch {

        return [];
    }
}


/* =====================================================
   SAVE BLOG INDEX
===================================================== */

async function savePostsIndex(
    owner,
    repo,
    token,
    posts,
    message
) {

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
        "posts/index.json",
        indexBase64,
        message,
        token
    );
}


/* =====================================================
   MAIN FUNCTION
===================================================== */

export default async (request) => {

    /*
        Protect note loading and updating
        with the private CMS token.
    */

    if (!isAuthorized(request)) {

        return jsonResponse(
            {
                success: false,
                message:
                    "Unauthorized."
            },
            401
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

        /* =================================================
           GET
           Load an existing published note
        ================================================= */

        if (request.method === "GET") {

            const url =
                new URL(
                    request.url
                );

            const slug =
                String(
                    url.searchParams.get("slug") || ""
                ).trim();

            if (!slug) {

                return jsonResponse(
                    {
                        success: false,
                        message:
                            "A note slug is required."
                    },
                    400
                );
            }

            if (!isValidSlug(slug)) {

                return jsonResponse(
                    {
                        success: false,
                        message:
                            "Invalid note slug."
                    },
                    400
                );
            }

            const articlePath =
                `posts/${slug}.html`;

            const file =
                await getGitHubFile(
                    owner,
                    repo,
                    articlePath,
                    token
                );

            if (!file) {

                return jsonResponse(
                    {
                        success: false,
                        message:
                            "Published note not found."
                    },
                    404
                );
            }

            const article =
                extractArticleData(
                    file.content
                );

            return jsonResponse(
                {
                    success: true,
                    slug,
                    article
                }
            );
        }


        /* =================================================
           PUT
           Update an existing published note
        ================================================= */

        if (request.method === "PUT") {

            const body =
                await request.json();

            const slug =
                String(
                    body.slug || ""
                ).trim();

            const title =
                String(
                    body.title || ""
                ).trim();

            const category =
                String(
                    body.category ||
                    "Cybersecurity"
                ).trim();

            const tags =
                String(
                    body.tags || ""
                ).trim();

            let content =
                String(
                    body.content || ""
                ).trim();


            if (!slug) {

                return jsonResponse(
                    {
                        success: false,
                        message:
                            "A note slug is required."
                    },
                    400
                );
            }


            if (!isValidSlug(slug)) {

                return jsonResponse(
                    {
                        success: false,
                        message:
                            "Invalid note slug."
                    },
                    400
                );
            }


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


            /*
                Verify the article actually exists.
            */

            const articlePath =
                `posts/${slug}.html`;

            const existingArticle =
                await getGitHubFile(
                    owner,
                    repo,
                    articlePath,
                    token
                );

            if (!existingArticle) {

                return jsonResponse(
                    {
                        success: false,
                        message:
                            "Published note not found."
                    },
                    404
                );
            }


            /*
                Get the original publication date.

                Editing a note should NOT change
                its original publication date.
            */

            let publicationDate =
                new Date()
                    .toISOString()
                    .split("T")[0];

            const existingDateMatch =
                existingArticle.content.match(
                    /<div\s+class=["']post-meta["']>\s*([\s\S]*?)(?:\s*•|<\/div>)/i
                );

            if (existingDateMatch) {

                const possibleDate =
                    existingDateMatch[1]
                        .replace(/<[^>]*>/g, "")
                        .trim();

                if (
                    /^\d{4}-\d{2}-\d{2}$/.test(
                        possibleDate
                    )
                ) {
                    publicationDate =
                        possibleDate;
                }
            }


            /*
                Clean incoming article HTML.
            */

            content =
                cleanArticleHTML(
                    content
                );


            /*
                The admin editor uses:

                /assets/blog/...

                Convert existing images back to the
                article-relative format:

                ../assets/blog/...
            */

            content =
                content.replace(
                    /(["'])\/assets\/blog\//g,
                    "$1../assets/blog/"
                );


            /*
                Upload any NEW data URL images.

                Existing GitHub image paths remain untouched.
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
                Build updated article.
            */

            const articleHTML =
                createArticleHTML(
                    {
                        title,
                        category,
                        tags,
                        content,
                        date: publicationDate
                    }
                );


            const articleBase64 =
                Buffer.from(
                    articleHTML,
                    "utf8"
                ).toString("base64");


            /*
                Write article FIRST.

                This means old images are not removed
                until the new article is successfully saved.
            */

            await writeGitHubFile(
                owner,
                repo,
                articlePath,
                articleBase64,
                `Update note: ${title}`,
                token
            );


            /*
                Update public index.
            */

            let posts =
                await getPostsIndex(
                    owner,
                    repo,
                    token
                );


            /*
                Keep the same slug so existing URLs
                do not break.
            */

            posts =
                posts.filter(
                    post =>
                        post.slug !== slug
                );


            /*
                Generate excerpt.
            */

            const plainText =
                content
                    .replace(
                        /<[^>]*>/g,
                        " "
                    )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();


            const excerpt =
                plainText.length > 180
                    ? `${plainText.slice(0, 180)}...`
                    : plainText;


            posts.unshift(
                {
                    slug,
                    title,
                    category,
                    tags,
                    date: publicationDate,
                    excerpt,
                    url:
                        `posts/${slug}.html`
                }
            );


            /*
                Keep newest publication date first.
            */

            posts.sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


            await savePostsIndex(
                owner,
                repo,
                token,
                posts,
                `Update blog index for ${title}`
            );


            /*
                Remove OLD images that are no longer
                referenced by the updated article.

                This happens AFTER the article and index
                have been successfully written.
            */

            const existingImages =
                await listImageFiles(
                    owner,
                    repo,
                    slug,
                    token
                );


            const referencedImages =
                new Set();


            const imageReferenceRegex =
                /(?:\.\.\/)?assets\/blog\/[^/"']+\/(image-\d+\.(?:jpg|jpeg|png|gif|webp|svg))/gi;

            for (
                const match of content.matchAll(
                    imageReferenceRegex
                )
            ) {

                referencedImages.add(
                    match[1]
                );
            }


            const cleanupErrors = [];


            for (
                const image of existingImages
            ) {

                if (
                    !referencedImages.has(
                        image.name
                    )
                ) {

                    try {

                        await deleteGitHubFile(
                            owner,
                            repo,
                            image.path,
                            token
                        );

                    } catch (error) {

                        cleanupErrors.push(
                            {
                                file: image.path,
                                error:
                                    error.message
                            }
                        );
                    }
                }
            }


            return jsonResponse(
                {
                    success: true,
                    message:
                        "Note updated successfully.",
                    slug,
                    article:
                        articlePath,
                    index:
                        "posts/index.json",
                    cleanupErrors
                }
            );
        }


        /*
            Unsupported method.
        */

        return jsonResponse(
            {
                success: false,
                message:
                    "Use GET to load a note or PUT to update a note."
            },
            405
        );


    } catch (error) {

        console.error(
            "Update note error:",
            error
        );

        return jsonResponse(
            {
                success: false,
                message:
                    error.message ||
                    "Note update failed."
            },
            500
        );
    }
};