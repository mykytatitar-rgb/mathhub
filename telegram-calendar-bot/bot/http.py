"""One shared HTTP client, reused while a Vercel instance stays warm."""
import httpx2

http = httpx2.Client(timeout=httpx2.Timeout(30.0, connect=10.0))
