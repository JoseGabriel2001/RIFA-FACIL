"""
File upload and utility routes.

Handles image uploads and miscellaneous endpoints.

Endpoints:
    POST /upload-image - Upload an image
    GET /images/{filename} - Serve uploaded image
    GET / - API health check
    GET /my-tickets - User's purchased tickets
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from typing import List
import uuid
import shutil
import logging

from config import db
from config.settings import settings
from dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Utilities"])


# =============================================================================
# HEALTH CHECK
# =============================================================================

@router.get("/", response_model=dict)
async def health_check():
    """API health check endpoint."""
    return {"message": "RifaFacil API v2.0"}


# =============================================================================
# FILE UPLOADS
# =============================================================================

@router.post("/upload-image", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Upload an image file.
    
    Accepts common image formats (jpg, png, gif, webp).
    Returns the URL path to access the uploaded file.
    
    Args:
        file: Uploaded file
        user: Current authenticated user
        
    Returns:
        URL path to the uploaded image
        
    Raises:
        HTTPException 400: If file type is not allowed
    """
    # Validate file extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo requerido")
    
    extension = '.' + file.filename.split('.')[-1].lower()
    
    if extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido. Usa: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = settings.UPLOADS_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Image uploaded: {unique_filename} by user {user['id']}")
        
        return {
            "filename": unique_filename,
            "url": f"/uploads/{unique_filename}"
        }
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Error al subir archivo")


@router.get("/images/{filename}")
async def get_image(filename: str):
    """
    Serve an uploaded image.
    
    Args:
        filename: Name of the uploaded file
        
    Returns:
        Image file response
        
    Raises:
        HTTPException 404: If file not found
    """
    # Sanitize filename to prevent path traversal
    safe_filename = filename.replace('/', '').replace('\\', '').replace('..', '')
    file_path = settings.UPLOADS_DIR / safe_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    return FileResponse(file_path)


# =============================================================================
# USER TICKETS
# =============================================================================

@router.get("/my-tickets", response_model=List[dict])
async def get_my_tickets(user: dict = Depends(get_current_user)):
    """
    Get all tickets purchased by the current user.
    
    Groups tickets by raffle and includes raffle information.
    """
    # Find all raffles
    cursor = db.raffles.find({}, {"_id": 0})
    raffles = await cursor.to_list(length=1000)
    
    user_tickets = []
    
    for raffle in raffles:
        # Find tickets owned by this user
        my_tickets = [
            t for t in raffle['tickets']
            if t.get('buyer_email') == user['email'] and t['status'] == 'sold'
        ]
        
        if my_tickets:
            user_tickets.append({
                "raffle_id": raffle['id'],
                "raffle_title": raffle['title'],
                "prize": raffle['prize'],
                "draw_date": raffle['draw_date'],
                "status": raffle['status'],
                "winning_number": raffle.get('winning_number'),
                "share_code": raffle['share_code'],
                "tickets": [
                    {
                        "number": t['number'],
                        "purchased_at": t.get('purchased_at'),
                        "is_winner": t.get('isWinner', False)
                    }
                    for t in my_tickets
                ]
            })
    
    return user_tickets


# =============================================================================
# USER STATS
# =============================================================================

@router.get("/stats", response_model=dict)
async def get_user_stats(user: dict = Depends(get_current_user)):
    """
    Get statistics for the current user's raffles.
    
    Returns:
        Total raffles, active count, completed count,
        total tickets sold, and total revenue.
    """
    # Get user's raffles
    cursor = db.raffles.find(
        {"owner_id": user['id']},
        {"_id": 0}
    )
    raffles = await cursor.to_list(length=100)
    
    total_raffles = len(raffles)
    active_raffles = len([r for r in raffles if r['status'] == 'active'])
    completed_raffles = len([r for r in raffles if r['status'] == 'completed'])
    
    total_tickets_sold = 0
    total_revenue = 0.0
    
    for raffle in raffles:
        sold = [t for t in raffle['tickets'] if t['status'] == 'sold']
        total_tickets_sold += len(sold)
        total_revenue += len(sold) * raffle['ticket_price']
    
    return {
        "total_raffles": total_raffles,
        "active_raffles": active_raffles,
        "completed_raffles": completed_raffles,
        "total_tickets_sold": total_tickets_sold,
        "total_revenue": total_revenue
    }
