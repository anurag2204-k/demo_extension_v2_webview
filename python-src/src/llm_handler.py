from .config import llm

def generate_headings(topic):
    """Generates section headings for a given topic."""
    prompt = f"Generate 5-7 distinct section headings for a newsletter about '{topic}'. Return them as a numbered list."
    response = llm.invoke(prompt)
    content = response.content
    headings = [line.strip().split('. ', 1)[1] for line in content.strip().split('\n') if '. ' in line] # type: ignore
    return headings

def generate_content(topic, heading):
    """Generates content for a specific section."""
    prompt = f"Write a detailed paragraph for a newsletter section. The newsletter is about '{topic}', and this section is '{heading}'."
    response = llm.invoke(prompt)
    return response.content.strip() # type: ignore
