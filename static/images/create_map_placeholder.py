from PIL import Image, ImageDraw

# Create a new image with a dark background
width, height = 800, 600
background_color = (44, 62, 80)  # Dark blue-gray
image = Image.new('RGB', (width, height), background_color)

# Create a drawing object
draw = ImageDraw.Draw(image)

# Draw some simple shapes to represent a map
line_color = (52, 152, 219)  # Light blue
draw.line([(50, 50), (750, 50), (750, 550), (50, 550), (50, 50)], fill=line_color, width=2)
draw.line([(50, 300), (750, 300)], fill=line_color, width=2)
draw.line([(400, 50), (400, 550)], fill=line_color, width=2)

# Add some circles to represent locations
circle_color = (231, 76, 60)  # Red
draw.ellipse((100, 100, 120, 120), fill=circle_color)
draw.ellipse((300, 200, 320, 220), fill=circle_color)
draw.ellipse((500, 400, 520, 420), fill=circle_color)
draw.ellipse((700, 300, 720, 320), fill=circle_color)

# Save the image
image.save('static/images/map_placeholder.png')
print("Map placeholder image created successfully.")
