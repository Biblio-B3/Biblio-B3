import sharp from "sharp";
import { AppError } from "../utils/AppError";

interface EnhancementOptions {
    upscale?: boolean;
    sharpen?: boolean;
    denoise?: boolean;
    contrast?: boolean;
    targetWidth?: number;
    targetHeight?: number;
}

export class ImageEnhancementService {
    //Améliore la qualité d"une image en utilisant Sharp

    static async enhanceImage(
        imageBuffer: Buffer,
        options: EnhancementOptions = {}
    ): Promise<Buffer> {
        try {
            const {
                upscale = true,
                sharpen = true,
                denoise = true,
                contrast = true,
                targetWidth = 400,
                targetHeight = 600
            } = options;

            let pipeline = sharp(imageBuffer);

            //Obtenir les métadonnées de l"image originale
            const metadata = await pipeline.metadata();
            const originalWidth = metadata.width || 0;
            const originalHeight = metadata.height || 0;

            //Upscaling intelligent
            if (upscale && originalWidth < targetWidth) {
                // Utilise Lanczos pour un upscaling de qualité
                pipeline = pipeline.resize(targetWidth, targetHeight, {
                    kernel: sharp.kernel.lanczos3,
                    fit: "inside",
                    withoutEnlargement: false
                });
            } else if (originalWidth > targetWidth) {
                //Redimensionne si trop grande
                pipeline = pipeline.resize(targetWidth, targetHeight, {
                    fit: "inside",
                    withoutEnlargement: true
                });
            }

            //Amélioration du contraste
            if (contrast) {
                pipeline = pipeline.modulate({
                    brightness: 1.05,
                    saturation: 1.1,
                    hue: 0
                });
            }

            // Netteté - FIXED: Using new object syntax
            if (sharpen) {
                pipeline = pipeline.sharpen({
                    sigma: 1,     // Previously: first parameter
                    m1: 1,        // Previously: flat parameter  
                    m2: 2         // Previously: jagged parameter
                });
            }

            // Réduction du bruit
            if (denoise) {
                pipeline = pipeline.median(1);
            }

            // Optimisation finale
            pipeline = pipeline
                .jpeg({
                    quality: 95,
                    progressive: true,
                    mozjpeg: true
                });

            return await pipeline.toBuffer();

        } catch (error) {
            console.error("Error enhancing image:", error);
            throw new AppError("Failed to enhance image quality", 500);
        }
    }

    /**
     * Amélioration avancée avec détection de contenu
     */
    static async enhanceBookCoverImage(imageBuffer: Buffer): Promise<Buffer> {
        try {
            const pipeline = sharp(imageBuffer);
            const metadata = await pipeline.metadata();

            // Paramètres spécifiques pour les couvertures de livres
            const enhancedBuffer = await pipeline
                // Redimensionnement optimal pour les couvertures
                .resize(400, 600, {
                    fit: "inside",
                    withoutEnlargement: false,
                    kernel: sharp.kernel.lanczos3
                })
                // Amélioration du contraste pour le texte
                .modulate({
                    brightness: 1.02,
                    saturation: 1.15,
                    hue: 0
                })
                // Netteté pour améliorer la lisibilité du texte - FIXED
                .sharpen({
                    sigma: 1.2,   // Previously: first parameter
                    m1: 1,        // Previously: flat parameter
                    m2: 2         // Previously: jagged parameter
                })
                // Réduction légère du bruit
                .median(1)
                // Amélioration des bords pour le texte
                .convolve({
                    width: 3,
                    height: 3,
                    kernel: [-1, -1, -1, -1, 9, -1, -1, -1, -1]
                })
                // Compression optimisée
                .jpeg({
                    quality: 95,
                    progressive: true,
                    mozjpeg: true
                })
                .toBuffer();

            return enhancedBuffer;

        } catch (error) {
            console.error("Error enhancing book cover:", error);
            throw new AppError("Failed to enhance book cover image", 500);
        }
    }

    // Détecte si une image nécessite une amélioration
    static async needsEnhancement(imageBuffer: Buffer): Promise<boolean> {
        try {
            const metadata = await sharp(imageBuffer).metadata();
            const width = metadata.width || 0;
            const height = metadata.height || 0;

            // Critères pour déterminer si l"amélioration est nécessaire
            const isSmall = width < 300 || height < 400;
            const isLowQuality = (metadata.density || 72) < 150;
            
            return isSmall || isLowQuality;

        } catch (error) {
            console.error("Error analyzing image:", error);
            return false;
        }
    }

    // Traitement par lot pour plusieurs images
    static async enhanceImageBatch(
        images: Buffer[],
        options: EnhancementOptions = {}
    ): Promise<Buffer[]> {
        const enhancedImages: Buffer[] = [];

        for (const imageBuffer of images) {
            try {
                const enhanced = await this.enhanceBookCoverImage(imageBuffer);
                enhancedImages.push(enhanced);
            } catch (error) {
                console.error("Error in batch enhancement:", error);
                // En cas d"erreur, garder l"image originale
                enhancedImages.push(imageBuffer);
            }
        }

        return enhancedImages;
    }
}

// Service alternatif utilisant des algorithmes personnalisés
export class CustomImageEnhancer {
    // Algorithme d"interpolation bicubique personnalisé
    static async bicubicUpscale(
        imageBuffer: Buffer,
        scaleFactor: number = 2
    ): Promise<Buffer> {
        try {
            const pipeline = sharp(imageBuffer);
            const metadata = await pipeline.metadata();
            
            const newWidth = Math.floor((metadata.width || 0) * scaleFactor);
            const newHeight = Math.floor((metadata.height || 0) * scaleFactor);

            return await pipeline
                .resize(newWidth, newHeight, {
                    kernel: sharp.kernel.cubic
                })
                .toBuffer();

        } catch (error) {
            throw new AppError("Bicubic upscaling failed", 500, error);
        }
    }

    // Filtre unsharp mask pour améliorer la netteté - FIXED
    static async unsharpMask(
        imageBuffer: Buffer,
        radius: number = 1.0,
        amount: number = 1.0
    ): Promise<Buffer> {
        try {
            return await sharp(imageBuffer)
                .sharpen({
                    sigma: radius,    // radius maps to sigma
                    m1: 1,           // flat areas sharpening
                    m2: amount       // amount maps to jagged areas
                })
                .toBuffer();

        } catch (error) {
            throw new AppError("Unsharp mask failed", 500, error);
        }
    }
}