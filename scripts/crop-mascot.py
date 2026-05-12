#!/usr/bin/env python3
"""Crop mascot sprite sheet to individual poses"""
from PIL import Image
import os

def crop_sprites(input_path, output_dir):
    img = Image.open(input_path)
    width, height = img.size

    poses = ['idle', 'active', 'working', 'waiting', 'error']
    pose_width = width // 5

    os.makedirs(output_dir, exist_ok=True)

    for i, pose in enumerate(poses):
        left = i * pose_width + 30
        right = (i + 1) * pose_width - 30
        top = 250
        bottom = height - 250

        cropped = img.crop((left, top, right, bottom))
        cropped.save(f'{output_dir}/{pose}.png', 'PNG')
        print(f"Saved: {pose}.png ({cropped.size[0]}x{cropped.size[1]})")

if __name__ == "__main__":
    crop_sprites(
        "ChatGPT Image 2026年5月13日 00_50_11.png",
        "src/assets/mascot"
    )
