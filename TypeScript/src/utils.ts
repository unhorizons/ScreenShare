import { Response } from 'express'; // Express framework

/**
 * Utility function to raise a 404 error with a custom message.
 * 
 * @param {Response} res - The Express response object.
 * @param {string} detail - The custom error message to include in the response.
 * @returns {Response} The Express response object with a 404 status and error message.
 */
export function raise404(res: Response, detail: string) {
    res.status(404); // Set the HTTP status code to 404 (Not Found)
    return res.json({
        detail: detail, // Include the custom error message in the response
    });
}