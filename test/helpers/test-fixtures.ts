/**
 * Shared test fixtures and mock data for parallel processing tests
 */

import { type CodeChunk } from '../../src/types/index.ts';

/**
 * Creates mock code chunks for testing
 */
export function createMockChunks(
  count: number,
  options: {
    category?: string | ((index: number) => string);
    contentSize?: 'small' | 'medium' | 'large';
    triggerError?: boolean;
    errorIndex?: number;
  } = {}
): CodeChunk[] {
  const {
    category = (i: number) => i % 2 === 0 ? 'components' : 'services',
    contentSize = 'small',
    triggerError = false,
    errorIndex = 1
  } = options;

  return Array.from({ length: count }, (_, i) => {
    const categoryName = typeof category === 'function' ? category(i) : category;
    const shouldTriggerError = triggerError && i === errorIndex;
    
    return {
      category: categoryName,
      files: [{
        path: `test_${categoryName}_${i}.dart`,
        content: shouldTriggerError ? 'TRIGGER_ERROR' : generateMockContent(i, contentSize, categoryName)
      }],
      context: `Test chunk ${i} for ${categoryName}`
    };
  });
}

/**
 * Generates mock Dart/Flutter content of varying sizes
 */
function generateMockContent(
  index: number,
  size: 'small' | 'medium' | 'large',
  category: string
): string {
  const baseContent = `
class ${category}Class${index} {
  final String data;
  
  ${category}Class${index}({required this.data});
  
  void method() {
    print('Test ${index}');
  }
}`;

  if (size === 'small') {
    return baseContent;
  }

  const flutterContent = `
import 'package:flutter/material.dart';

class ${category}Widget${index} extends StatelessWidget {
  final String data;
  
  const ${category}Widget${index}({required this.data});
  
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          Text(data),
          ElevatedButton(
            onPressed: () => handleAction(),
            child: Text('Action $index'),
          ),
        ],
      ),
    );
  }
  
  void handleAction() {
    final result = processData(data);
    print('Processed: \$result');
  }
  
  String processData(String input) {
    return input.toUpperCase();
  }
}`;

  if (size === 'medium') {
    return flutterContent;
  }

  // Large content includes additional methods and comments
  return flutterContent + `

  // Additional methods for large content test
  ${Array.from({ length: 10 }, (_, i) => `
  void additionalMethod${i}() {
    // Simulate complex business logic
    final complexData = List.generate(100, (i) => 'item_\$i');
    complexData.forEach((item) {
      processData(item);
    });
  }
  `).join('\n')}
  
  /* ${'Large comment block '.repeat(50)} */
`;
}

/**
 * Creates realistic Flutter/Dart project chunks by category
 */
export function createRealisticChunks(categories: string[] = ['components', 'services', 'state', 'utils']): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  
  categories.forEach((category, catIndex) => {
    // Add 2-3 files per category
    const fileCount = 2 + (catIndex % 2);
    
    for (let i = 0; i < fileCount; i++) {
      chunks.push({
        category,
        files: [{
          path: `lib/src/${category}/file_${catIndex}_${i}.dart`,
          content: generateRealisticContent(category, i)
        }],
        context: `Realistic ${category} chunk ${i}`
      });
    }
  });
  
  return chunks;
}

function generateRealisticContent(category: string, index: number): string {
  const templates: Record<string, string> = {
    components: `
import 'package:flutter/material.dart';

class Custom${category}${index} extends StatefulWidget {
  final String title;
  final VoidCallback? onAction;
  
  const Custom${category}${index}({
    Key? key,
    required this.title,
    this.onAction,
  }) : super(key: key);
  
  @override
  State<Custom${category}${index}> createState() => _Custom${category}${index}State();
}

class _Custom${category}${index}State extends State<Custom${category}${index}> {
  bool _isLoading = false;
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(widget.title),
        trailing: _isLoading 
          ? CircularProgressIndicator()
          : IconButton(
              icon: Icon(Icons.arrow_forward),
              onPressed: _handleAction,
            ),
      ),
    );
  }
  
  Future<void> _handleAction() async {
    setState(() => _isLoading = true);
    await Future.delayed(Duration(seconds: 1));
    widget.onAction?.call();
    setState(() => _isLoading = false);
  }
}`,
    
    services: `
import 'dart:convert';
import 'package:http/http.dart' as http;

class ${category}Service${index} {
  final String baseUrl;
  final http.Client _client;
  
  ${category}Service${index}({
    required this.baseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();
  
  Future<Map<String, dynamic>> fetchData(String endpoint) async {
    try {
      final response = await _client.get(
        Uri.parse('\$baseUrl/\$endpoint'),
        headers: {'Content-Type': 'application/json'},
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to load data: \${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: \$e');
    }
  }
  
  Future<void> postData(String endpoint, Map<String, dynamic> data) async {
    final response = await _client.post(
      Uri.parse('\$baseUrl/\$endpoint'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(data),
    );
    
    if (response.statusCode != 201) {
      throw Exception('Failed to post data');
    }
  }
}`,
    
    state: `
import 'package:flutter/foundation.dart';

class ${category}Manager${index} extends ChangeNotifier {
  List<String> _items = [];
  bool _isLoading = false;
  String? _error;
  
  List<String> get items => List.unmodifiable(_items);
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  Future<void> loadItems() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      await Future.delayed(Duration(seconds: 1));
      _items = List.generate(10, (i) => 'Item \$i');
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  void addItem(String item) {
    _items.add(item);
    notifyListeners();
  }
  
  void removeItem(int index) {
    if (index >= 0 && index < _items.length) {
      _items.removeAt(index);
      notifyListeners();
    }
  }
  
  void clearItems() {
    _items.clear();
    _error = null;
    notifyListeners();
  }
}`,
    
    utils: `
class ${category}Helper${index} {
  static String formatDate(DateTime date) {
    return '\${date.year}-\${date.month.toString().padLeft(2, '0')}-\${date.day.toString().padLeft(2, '0')}';
  }
  
  static bool isValidEmail(String email) {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    );
    return emailRegex.hasMatch(email);
  }
  
  static double calculatePercentage(int value, int total) {
    if (total == 0) return 0.0;
    return (value / total) * 100;
  }
  
  static List<T> removeDuplicates<T>(List<T> list) {
    return list.toSet().toList();
  }
  
  static String truncateString(String text, int maxLength) {
    if (text.length <= maxLength) return text;
    return '\${text.substring(0, maxLength)}...';
  }
}`
  };
  
  return templates[category] ?? templates['utils']!
}