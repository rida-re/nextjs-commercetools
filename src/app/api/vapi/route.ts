import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { command, parameters } = await req.json();
  
  console.log(command)
  
  // Handle different commands
  switch(command) {
    case 'navigate_to_cart':
      // Your navigation logic
      return Response.json({ message: "Navigating to cart" });
      
    case 'navigate_to_home':
      return Response.json({ message: "Going to home page" });
      
    case 'show_products':
      const category = parameters?.category;
      return Response.json({ 
        message: category ? `Showing ${category} products` : "Showing all products"
      });
      
    case 'search_products':
      return Response.json({ 
        message: `Searching for: ${parameters.query}` 
      });
      
    default:
      return Response.json({ message: "Command not recognized" });
  }
}