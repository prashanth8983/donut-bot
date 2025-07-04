import { motion } from 'framer-motion';

const Usage = () => {
  return (
    <section id="usage" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white">Architecture & Usage</h2>
          <p className="mt-4 text-lg text-gray-400">
            Understand the system architecture and how to interact with the API.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-gray-800 p-8 rounded-lg shadow-lg"
          >
            <h3 className="text-2xl font-semibold text-white mb-4">System Architecture</h3>
            <ul className="space-y-4 text-gray-300">
              <li className="flex items-start"><span className="text-indigo-400 mr-3">➔</span><div><strong className="text-white">React Dashboard:</strong> For real-time monitoring and control.</div></li>
              <li className="flex items-start"><span className="text-indigo-400 mr-3">➔</span><div><strong className="text-white">FastAPI Backend:</strong> Asynchronous, high-performance API.</div></li>
              <li className="flex items-start"><span className="text-indigo-400 mr-3">➔</span><div><strong className="text-white">Redis URL Frontier:</strong> Manages the queue of URLs to be crawled.</div></li>
              <li className="flex items-start"><span className="text-indigo-400 mr-3">➔</span><div><strong className="text-white">MongoDB Job Storage:</strong> Persists job configurations and metadata.</div></li>
              <li className="flex items-start"><span className="text-indigo-400 mr-3">➔</span><div><strong className="text-white">Bloom Filter:</strong> For efficient URL deduplication.</div></li>
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-gray-800 p-8 rounded-lg shadow-lg"
          >
            <h3 className="text-2xl font-semibold text-white mb-4">Key Capabilities</h3>
            <ul className="space-y-4 text-gray-300">
                <li><strong className="text-white">Concurrent Crawling:</strong> Configurable workers (default: 3).</li>
                <li><strong className="text-white">Smart URL Management:</strong> Priority-based URL scheduling.</li>
                <li><strong className="text-white">Content Extraction:</strong> BeautifulSoup-based HTML parsing.</li>
                <li><strong className="text-white">Real-time Monitoring:</strong> Live metrics and progress tracking.</li>
            </ul>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-12 bg-gray-800 p-8 rounded-lg shadow-lg"
        >
          <h3 className="text-2xl font-semibold text-white mb-4">API Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-medium mb-3">Start Crawler</h4>
              <pre className="text-sm text-gray-300 bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <code>
                  {`curl -X POST "http://localhost:8000/api/v1/crawler/start" \ 
-H "Content-Type: application/json" \ 
-d '{
  "config": {
    "workers": 4,
    "max_depth": 3,
    "max_pages": 1000,
    "allowed_domains": ["example.com"]
  }
}'`}
                </code>
              </pre>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Get Status</h4>
              <pre className="text-sm text-gray-300 bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <code>
                  {`curl "http://localhost:8000/api/v1/crawler/status"

# Returns:
{
  "crawler_running": true,
  "pages_crawled_total": 150,
  "avg_pages_per_second": 2.5,
  "frontier_queue_size": 45
}`}
                </code>
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Usage;