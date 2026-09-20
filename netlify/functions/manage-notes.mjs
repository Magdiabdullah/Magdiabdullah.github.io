const API_BASE = "https://api.github.com";

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = "main";


/* =====================================================
   RESPONSE
===================================================== */

function jsonResponse(statusCode, body) {

    return {
        statusCode,

        headers: {
            "Content-Type":
                "application/json; charset=utf-8",

            "Cache-Control":
                "no-store"
        },

        body:
            JSON.stringify(body)
    };
}


/* =====================================================
   CMS AUTHORIZATION
===================================================== */

function isAuthorized(event) {

    const expectedToken =
        process.env.CMS_ADMIN_TOKEN;

    if (!expectedToken) {
        return false;
    }

    const headers =
        event.headers || {};

    const authorization =
        headers.authorization ||
        headers.Authorization ||
        "";

    return authorization ===
        `Bearer ${expectedToken}`;
}


/* =====================================================
   GITHUB HEADERS
===================================================== */

function githubHeaders() {

    return {

        "Authorization":
            `Bearer ${TOKEN}`,

        "Accept":
            "application/vnd.github+json",

        "X-GitHub-Api-Version":
            "2022-11-28",

        "Content-Type":
            "application/json"
    };
}


/* =====================================================
   CONFIGURATION
===================================================== */

function validateConfig() {

    if (
        !TOKEN ||
        !OWNER ||
        !REPO
    ) {

        throw new Error(
            "GitHub publishing configuration is missing."
        );
    }
}


/* =====================================================
   SAFE SLUG
===================================================== */

function cleanSlug(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(
            /[^a-z0-9-]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );
}


/* =====================================================
   GITHUB REQUEST
===================================================== */

async function githubRequest(
    path,
    options = {}
) {

    const response =
        await fetch(
            `${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}`,

            {
                ...options,

                headers: {
                    ...githubHeaders(),
                    ...(options.headers || {})
                }
            }
        );


    const text =
        await response.text();


    let data;


    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    } catch {

        data = {
            message: text
        };
    }


    if (!response.ok) {

        const error =
            new Error(
                data.message ||
                `GitHub request failed (${response.status}).`
            );


        error.status =
            response.status;


        error.data =
            data;


        throw error;
    }


    return data;
}


/* =====================================================
   GET FILE
===================================================== */

async function getFile(path) {

    return githubRequest(
        `${path}?ref=${encodeURIComponent(BRANCH)}`
    );
}


/* =====================================================
   GET POSTS INDEX
===================================================== */

async function getIndex() {

    try {

        const file =
            await getFile(
                "posts/index.json"
            );


        const content =
            Buffer
                .from(
                    file.content.replace(/\n/g, ""),
                    "base64"
                )
                .toString("utf8");


        let posts = [];


        try {

            posts =
                JSON.parse(content);

        } catch {

            throw new Error(
                "posts/index.json contains invalid JSON."
            );
        }


        if (!Array.isArray(posts)) {

            throw new Error(
                "posts/index.json must contain an array."
            );
        }


        return {

            posts,

            sha:
                file.sha
        };

    } catch (error) {

        if (error.status === 404) {

            return {

                posts: [],

                sha: null
            };
        }


        throw error;
    }
}


/* =====================================================
   UPDATE GITHUB FILE
===================================================== */

async function updateFile(
    path,
    content,
    sha,
    message
) {

    const body = {

        message,

        content:
            Buffer
                .from(
                    content,
                    "utf8"
                )
                .toString("base64"),

        branch:
            BRANCH
    };


    if (sha) {

        body.sha =
            sha;
    }


    return githubRequest(
        path,

        {
            method:
                "PUT",

            body:
                JSON.stringify(body)
        }
    );
}


/* =====================================================
   LIST DIRECTORY
===================================================== */

async function listDirectory(path) {

    try {

        const result =
            await githubRequest(
                `${path}?ref=${encodeURIComponent(BRANCH)}`
            );


        return Array.isArray(result)
            ? result
            : [];

    } catch (error) {

        if (error.status === 404) {

            return [];
        }


        throw error;
    }
}


/* =====================================================
   DELETE GITHUB FILE
===================================================== */

async function deleteFile(
    path,
    sha,
    message
) {

    return githubRequest(

        path,

        {
            method:
                "DELETE",

            body:
                JSON.stringify({

                    message,

                    sha,

                    branch:
                        BRANCH
                })
        }
    );
}


/* =====================================================
   DELETE PUBLISHED NOTE
===================================================== */

async function removePublishedNote(
    slug
) {

    const safeSlug =
        cleanSlug(slug);


    if (
        !safeSlug ||
        safeSlug !== slug
    ) {

        throw new Error(
            "Invalid note slug."
        );
    }


    const index =
        await getIndex();


    const note =
        index.posts.find(
            post =>
                post &&
                post.slug === safeSlug
        );


    if (!note) {

        const error =
            new Error(
                "Published note was not found."
            );


        error.status =
            404;


        throw error;
    }


    /*
        Remove the note from the public
        index first.
    */

    const updatedPosts =
        index.posts.filter(
            post =>
                !(
                    post &&
                    post.slug === safeSlug
                )
        );


    const newIndexContent =
        JSON.stringify(
            updatedPosts,
            null,
            2
        ) + "\n";


    await updateFile(

        "posts/index.json",

        newIndexContent,

        index.sha,

        `Remove published note: ${safeSlug}`
    );


    const cleanupErrors = [];


    /* =================================================
       DELETE ARTICLE HTML
    ================================================= */

    try {

        const article =
            await getFile(
                `posts/${safeSlug}.html`
            );


        await deleteFile(

            `posts/${safeSlug}.html`,

            article.sha,

            `Delete article: ${safeSlug}`
        );

    } catch (error) {

        if (
            error.status !== 404
        ) {

            cleanupErrors.push(
                `Article cleanup failed: ${error.message}`
            );
        }
    }


    /* =================================================
       DELETE NOTE IMAGES
    ================================================= */

    try {

        const imageFiles =
            await listDirectory(
                `assets/blog/${safeSlug}`
            );


        for (
            const file
            of imageFiles
        ) {

            if (
                file.type !== "file"
            ) {

                continue;
            }


            try {

                await deleteFile(

                    file.path,

                    file.sha,

                    `Delete note asset: ${safeSlug}`
                );

            } catch (error) {

                cleanupErrors.push(
                    `${file.path}: ${error.message}`
                );
            }
        }

    } catch (error) {

        cleanupErrors.push(
            `Image directory cleanup failed: ${error.message}`
        );
    }


    return {

        slug:
            safeSlug,

        cleanupComplete:
            cleanupErrors.length === 0,

        cleanupErrors
    };
}


/* =====================================================
   MAIN FUNCTION
===================================================== */

export async function handler(
    event
) {

    try {

        /* =============================================
           CMS AUTHORIZATION
        ============================================= */

        if (!isAuthorized(event)) {

            return jsonResponse(

                401,

                {

                    success:
                        false,

                    message:
                        "Unauthorized."
                }
            );
        }


        validateConfig();


        /* =============================================
           GET PUBLISHED NOTES
        ============================================= */

        if (
            event.httpMethod === "GET"
        ) {

            const index =
                await getIndex();


            return jsonResponse(

                200,

                {

                    success:
                        true,

                    posts:
                        index.posts
                }
            );
        }


        /* =============================================
           DELETE PUBLISHED NOTE
        ============================================= */

        if (
            event.httpMethod === "DELETE"
        ) {

            let body = {};


            try {

                body =
                    event.body
                        ? JSON.parse(event.body)
                        : {};

            } catch {

                return jsonResponse(

                    400,

                    {

                        success:
                            false,

                        message:
                            "Invalid JSON request."
                    }
                );
            }


            const slug =
                String(
                    body.slug || ""
                ).trim();


            if (!slug) {

                return jsonResponse(

                    400,

                    {

                        success:
                            false,

                        message:
                            "A note slug is required."
                    }
                );
            }


            const result =
                await removePublishedNote(
                    slug
                );


            if (
                !result.cleanupComplete
            ) {

                return jsonResponse(

                    207,

                    {

                        success:
                            true,

                        message:
                            "The note was removed from the public index, but some GitHub files could not be cleaned up.",

                        ...result
                    }
                );
            }


            return jsonResponse(

                200,

                {

                    success:
                        true,

                    message:
                        "Published note deleted successfully.",

                    ...result
                }
            );
        }


        /* =============================================
           OTHER METHODS
        ============================================= */

        return jsonResponse(

            405,

            {

                success:
                    false,

                message:
                    "Method not allowed."
            }
        );

    } catch (error) {

        console.error(
            "Manage notes error:",
            error
        );


        const status =
            error.status === 404
                ? 404
                : 500;


        return jsonResponse(

            status,

            {

                success:
                    false,

                message:
                    error.message ||
                    "An unexpected server error occurred."
            }
        );
    }
}